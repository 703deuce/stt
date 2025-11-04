'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PLAN_CONFIG = {
  'transcription-only': {
    name: 'Transcription Only',
    price: '$17.99',
    interval: 'month',
    features: [
      'Unlimited transcription',
      'Speaker diarization',
      'Word-level timestamps',
      'AI summaries & insights',
      '25+ languages',
      'Batch processing',
      'SRT/VTT subtitle export'
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TRANSCRIPTION_ONLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || 'price_1MywhCKjM2RWgyrvmmJvdIYP'
  },
  'creator': {
    name: 'Creator Plan',
    price: '$34.99',
    interval: 'month',
    features: [
      'Unlimited transcription',
      'Unlimited content repurposing',
      '30+ content types',
      'Copywriting frameworks',
      'Custom instructions',
      'All transcription features',
      'Speaker diarization & timestamps'
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR || process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM || 'price_1MywdsKjM2RWgyrvmPsAYWr1'
  },
  // Legacy plans for backwards compatibility
  solo: {
    name: 'Transcription Only',
    price: '$17.99',
    interval: 'month',
    features: [
      'Unlimited transcription',
      'Speaker diarization',
      'Word-level timestamps',
      'AI summaries & insights',
      '25+ languages',
      'Batch processing',
      'SRT/VTT subtitle export'
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || 'price_1MywhCKjM2RWgyrvmmJvdIYP'
  },
  team: {
    name: 'Creator Plan',
    price: '$34.99',
    interval: 'month',
    features: [
      'Unlimited transcription',
      'Unlimited content repurposing',
      '30+ content types',
      'Copywriting frameworks',
      'Custom instructions',
      'All transcription features',
      'Speaker diarization & timestamps'
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM || 'price_1MywdsKjM2RWgyrvmPsAYWr1'
  }
};

export default function SignupWithPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const plan = params?.plan as string;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];

  useEffect(() => {
    // If user is already logged in, skip signup and go straight to checkout
    if (user) {
      handleCheckout(user.uid, user.email!);
    }
  }, [user]);

  useEffect(() => {
    // Redirect if invalid plan
    if (!planConfig) {
      router.push('/');
    }
  }, [plan, planConfig, router]);

  const handleCheckout = async (userId: string, userEmail: string) => {
    try {
      setLoading(true);
      setError('');

      // All plans use quantity 1
      let finalQuantity = 1;

      // Create Stripe checkout session
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          quantity: finalQuantity,
          email: userEmail,
          userId: userId,
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
      setError(error.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Create user account (WITHOUT trial - they're paying)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Create user document WITHOUT trial (they're subscribing immediately)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        subscriptionStatus: 'pending', // Will be updated by webhook
        // Word limits (will be set by webhook based on plan)
        monthlyWordLimit: 0,
        wordsUsedThisMonth: 0,
        boostWords: 0,
      });

      console.log('✅ User account created, proceeding to checkout');

      // Immediately redirect to Stripe checkout
      await handleCheckout(userCredential.user.uid, userCredential.user.email!);

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
      setLoading(false);
    }
  };

  if (!planConfig) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4">
            ← Back to home
          </a>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Get Started with {planConfig.name}
          </h1>
          <p className="text-xl text-gray-600">
            Create your account and start transcribing in minutes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Plan Summary */}
          <div className="bg-white rounded-2xl p-8 border-2 border-orange-200 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{planConfig.name}</h2>
            
            <div className="mb-6">
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold text-orange-600">{planConfig.price}</span>
                <span className="text-gray-600 ml-2">/{planConfig.interval}</span>
              </div>
            </div>


            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">What's included:</h3>
              <ul className="space-y-3">
                {planConfig.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>🎉 Special Offer:</strong> First month at full price, cancel anytime!
              </p>
            </div>
          </div>

          {/* Right: Signup Form */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
            <p className="text-gray-600 mb-6">
              You'll be redirected to secure payment after signup
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Re-enter password"
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-4 px-6 rounded-lg hover:from-orange-600 hover:to-purple-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/auth" className="text-orange-600 hover:text-orange-700 font-medium">
                  Sign in
                </a>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
                Payment is processed securely by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

