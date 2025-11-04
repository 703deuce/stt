import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;
    const stripeSubscriptionId = userData?.stripeSubscriptionId;

    let subscription = null;
    let customer = null;

    // Get subscription details from Stripe if available
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      } catch (error) {
        console.error('Error retrieving subscription:', error);
      }
    }

    // Get customer details from Stripe if available
    if (stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(stripeCustomerId);
      } catch (error) {
        console.error('Error retrieving customer:', error);
      }
    }

    return NextResponse.json({
      subscriptionStatus: userData?.subscriptionStatus || 'trial',
      subscriptionPlan: userData?.subscriptionPlan || null,
      monthlyWordLimit: userData?.monthlyWordLimit || 0,
      wordsUsedThisMonth: userData?.wordsUsedThisMonth || 0,
      boostWords: userData?.boostWords || 0,
      stripeCustomerId: stripeCustomerId || null,
      stripeSubscriptionId: stripeSubscriptionId || null,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        items: subscription.items.data.map(item => ({
          priceId: item.price.id,
          plan: item.price.nickname || item.price.id,
        })),
      } : null,
      customer: customer ? {
        id: customer.id,
        email: customer.email,
      } : null,
    });

  } catch (error: any) {
    console.error('❌ Error getting subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

