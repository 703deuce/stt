import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, cancelImmediately } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
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
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Check if reactivating (cancelImmediately is false and subscription is already set to cancel)
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    if (!cancelImmediately && subscription.cancel_at_period_end) {
      // Reactivate subscription
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      
      const { updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'active',
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated successfully',
      });
    }

    if (cancelImmediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      // Cancel at end of billing period
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Note: The webhook will handle updating Firestore, but we can update immediately for better UX
    const { updateDoc, serverTimestamp } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', userId), {
      subscriptionStatus: cancelImmediately ? 'cancelled' : 'active',
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: cancelImmediately 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period',
    });

  } catch (error: any) {
    console.error('❌ Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

