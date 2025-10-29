import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    // Test Stripe connection by retrieving account info
    const account = await stripe.accounts.retrieve();
    
    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        created: account.created
      },
      message: 'Stripe API key is valid! ✅'
    });
  } catch (error: any) {
    console.error('❌ Stripe test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      type: error.type,
      code: error.code
    }, { status: 500 });
  }
}

