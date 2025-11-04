'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

interface CheckoutButtonProps {
  plan: 'transcription-only' | 'creator' | 'pro' | 'studio' | 
        'boost-5k' | 'boost-10k' | 'boost-50k' |
        'solo' | 'team' | 'agency'; // Legacy plans
  quantity?: number;
  children: React.ReactNode;
  className?: string;
}

export default function CheckoutButton({ 
  plan, 
  quantity, 
  children, 
  className = '' 
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan,
          quantity: quantity || 1,
          email: user.email,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const defaultClassName = "w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-orange-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={className || defaultClassName}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

