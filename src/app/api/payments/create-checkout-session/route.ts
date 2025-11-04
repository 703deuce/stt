import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import { auth } from '@/config/firebase';

export async function POST(request: NextRequest) {
  try {
    // ✅ FIX: Read body only ONCE
    const body = await request.json();
    const { plan, quantity, email, userId } = body;

    // Valid plan types
    const validPlans = [
      'transcription-only', 'creator',
      'solo', 'team' // Legacy
    ];

    // Validate plan
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'User email and ID required' },
        { status: 401 }
      );
    }

    // All plans are subscriptions now
    const isBoost = false;
    
    // Determine quantity based on plan
    let finalQuantity = 1;
    if (plan === 'team') {
      finalQuantity = Math.max(quantity || 1, 1);
    }

    // Get the price ID for the selected plan
    const priceId = STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES];

    if (!priceId || priceId.startsWith('PLACEHOLDER')) {
      return NextResponse.json(
        { error: 'Price ID not configured for selected plan. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const sessionConfig: any = {
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: finalQuantity,
        },
      ],
      mode: isBoost ? 'payment' : 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
      metadata: {
        userId: userId,
        plan: plan,
        userEmail: email,
        type: isBoost ? 'boost' : 'subscription',
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    };

    // Add subscription_data only for subscription plans
    if (!isBoost) {
      sessionConfig.subscription_data = {
        metadata: {
          userId: userId,
          plan: plan,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error: any) {
    console.error('❌ Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

