import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { stripe, STRIPE_PRICES, PRICE_CONFIG } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, newPlan } = body;

    if (!userId || !newPlan) {
      return NextResponse.json(
        { error: 'User ID and plan are required' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans = ['transcription-only', 'creator', 'solo', 'team'];
    if (!validPlans.includes(newPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get user document to find Stripe subscription ID
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData?.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Get the new price ID
    const newPriceId = STRIPE_PRICES[newPlan as keyof typeof STRIPE_PRICES];
    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Price ID not found for selected plan' },
        { status: 500 }
      );
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Update subscription to new plan
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', // Prorate the change
      metadata: {
        userId: userId,
        plan: newPlan,
      },
    });

    // Update word limits based on new plan
    const planConfig = PRICE_CONFIG[newPlan as keyof typeof PRICE_CONFIG];
    const monthlyWordLimit = planConfig?.features?.contentWords || 0;

    // Note: The webhook will handle updating Firestore, but we can update immediately for better UX
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', userId), {
      subscriptionPlan: newPlan,
      monthlyWordLimit: monthlyWordLimit,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        plan: newPlan,
      },
    });

  } catch (error: any) {
    console.error('❌ Error changing plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change plan' },
      { status: 500 }
    );
  }
}

