import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/config/firebase';
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import Stripe from 'stripe';
import { monitoringService } from '@/services/monitoringService';

// Disable body parsing, need raw body for webhook signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No Stripe signature found');
    await monitoringService.trackStripeWebhook('unknown', false, 'No signature provided');
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    await monitoringService.trackStripeWebhook('signature_verification', false, err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  console.log('✅ Stripe webhook received:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout session completed:', session.id);

        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const type = session.metadata?.type; // 'boost' or 'subscription'
        const customerEmail = session.customer_email;

        if (!userId) {
          console.error('❌ No userId in session metadata');
          break;
        }

        const userRef = doc(db, 'users', userId);
        
        // Handle word boosts (one-time purchases)
        if (type === 'boost' || plan?.startsWith('boost-')) {
          const boostWords = {
            'boost-5k': 5000,
            'boost-10k': 10000,
            'boost-50k': 50000,
          }[plan as string] || 0;

          // Get current user data
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          const currentBoostWords = userData?.boostWords || 0;

          await updateDoc(userRef, {
            boostWords: currentBoostWords + boostWords,
            updatedAt: serverTimestamp(),
          });

          console.log(`✅ Added ${boostWords} boost words to user ${userId}. New total: ${currentBoostWords + boostWords}`);
        } 
        // Handle subscription plans
        else {
          // Map plan to word limits (use very large number for unlimited)
          const planWordLimits = {
            'transcription-only': 0,
            'creator': 999999999, // Unlimited (using large number for Firestore)
            // Legacy plans
            'solo': 0,
            'team': 999999999, // Unlimited (maps to creator)
          };

          const monthlyWordLimit = planWordLimits[plan as keyof typeof planWordLimits] || 0;

          await updateDoc(userRef, {
            subscriptionStatus: 'active',
            subscriptionPlan: plan,
            monthlyWordLimit: monthlyWordLimit,
            wordsUsedThisMonth: 0, // Reset on new subscription
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            subscriptionStartDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // End trial when subscription starts
            'trial.isActive': false,
            'trial.hasEnded': true,
          });

          console.log(`✅ User subscription activated: ${userId} - Plan: ${plan} (${monthlyWordLimit} words/month)`);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id);

        const userId = subscription.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No userId in subscription metadata');
          break;
        }

        const userRef = doc(db, 'users', userId);
        
        // Update subscription status based on Stripe status
        let subscriptionStatus = 'active';
        if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
          subscriptionStatus = 'cancelled';
        } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          subscriptionStatus = 'expired';
        }

        await updateDoc(userRef, {
          subscriptionStatus: subscriptionStatus,
          updatedAt: serverTimestamp(),
        });

        console.log('✅ User subscription status updated:', userId, subscriptionStatus);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription deleted:', subscription.id);

        const userId = subscription.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No userId in subscription metadata');
          break;
        }

        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
          subscriptionStatus: 'cancelled',
          subscriptionEndDate: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        console.log('✅ User subscription cancelled:', userId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Invoice payment succeeded:', invoice.id);
        
        // You can log payments to a separate collection if needed
        // For now, just log it
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('⚠️ Invoice payment failed:', invoice.id);
        
        // Send critical alert for payment failure
        await monitoringService.sendAlert({
          type: 'payment_failed',
          severity: 'high',
          message: `Payment failed for invoice ${invoice.id}`,
          details: {
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amount: invoice.amount_due,
            attemptCount: invoice.attempt_count
          },
          userId: invoice.metadata?.userId
        });
        
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Track successful webhook processing
    await monitoringService.trackStripeWebhook(event.type, true);
    
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    
    // Track webhook processing failure
    await monitoringService.trackStripeWebhook(
      event?.type || 'unknown',
      false,
      error.message,
      { error: error.toString() }
    );
    
    // Send alert for webhook processing errors
    await monitoringService.sendAlert({
      type: 'webhook_error',
      severity: 'high',
      message: `Stripe webhook processing failed: ${error.message}`,
      details: {
        eventType: event?.type,
        errorMessage: error.message,
        errorStack: error.stack
      }
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

