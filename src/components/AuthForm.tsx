'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../config/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  
  // Check URL parameters for login mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'login') {
        setIsLogin(true);
      }
    }
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Initialize user document with 7-day trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days from now
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          subscriptionStatus: 'trial',
          trial: {
            isActive: true,
            startDate: serverTimestamp(),
            endDate: trialEndDate,
            minutesUsed: 0,
            minutesTotal: 90,
            contentWords: 2000, // 2,000 words for content generation
            contentWordsUsed: 0,
            hasEnded: false
          },
          // Subscription-based limits (set to 0 during trial)
          monthlyWordLimit: 0,
          wordsUsedThisMonth: 0,
          boostWords: 0
        });
        
        console.log('✅ User account created with 7-day trial (90 minutes)');
      }
      // Success - the useEffect will handle the redirect
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (err: any) {
      setError(err.message || "Error signing out");
    }
  };

  // Don't render anything if user is authenticated (redirect will happen)
  if (user) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-white/50 p-8 backdrop-blur-sm">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {isLogin ? "Sign In" : "Create Account"}
      </h2>
        {!isLogin && (
          <div className="inline-flex items-center bg-gradient-to-r from-green-50 to-teal-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mt-2 border border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            7-day free trial • 90 minutes included
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="ml-2 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
          <input
            id="email"
            type="email"
              placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
          />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
          />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-teal-500 text-white py-3.5 px-6 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {isLogin ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            <>
              {isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
        >
          {isLogin ? (
            <>
              Don't have an account? <span className="font-bold">Sign up for free</span>
            </>
          ) : (
            <>
              Already have an account? <span className="font-bold">Sign in</span>
            </>
          )}
        </button>
      </div>

      {!isLogin && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>By signing up, you agree to our Terms of Service and Privacy Policy.</p>
            <p className="flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
