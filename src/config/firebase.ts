import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// DEBUG: Log ALL env vars during build to diagnose Vercel issues
if (typeof window === 'undefined') {
  console.log('🔍 ===== COMPREHENSIVE ENVIRONMENT VARIABLES BUILD DEBUG =====');
  
  // Firebase variables
  console.log('🔥 [FIREBASE] Environment Variables:');
  console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 15)}...` : 'MISSING');
  console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'MISSING');
  console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING');
  console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'MISSING');
  console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'MISSING');
  console.log('NEXT_PUBLIC_FIREBASE_APP_ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'MISSING');
  console.log('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'MISSING');
  
  // API Keys
  console.log('🔑 [API KEYS] Environment Variables:');
  console.log('RUNPOD_API_KEY:', process.env.RUNPOD_API_KEY ? `${process.env.RUNPOD_API_KEY.substring(0, 10)}...` : 'MISSING');
  console.log('HUGGINGFACE_TOKEN:', process.env.HUGGINGFACE_TOKEN ? `${process.env.HUGGINGFACE_TOKEN.substring(0, 10)}...` : 'MISSING');
  console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? `${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...` : 'MISSING');
  console.log('NEXT_PUBLIC_DEEPSEEK_API_KEY:', process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ? `${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY.substring(0, 10)}...` : 'MISSING');
  
  // RunPod Endpoints
  console.log('🚀 [RUNPOD] Environment Variables:');
  console.log('RUNPOD_ENDPOINT_WITH_STORAGE:', process.env.RUNPOD_ENDPOINT_WITH_STORAGE || 'MISSING');
  console.log('RUNPOD_ENDPOINT_NO_STORAGE:', process.env.RUNPOD_ENDPOINT_NO_STORAGE || 'MISSING');
  console.log('RUNPOD_TTS_ENDPOINT:', process.env.RUNPOD_TTS_ENDPOINT || 'MISSING');
  console.log('RUNPOD_VOICE_TRANSFER_ENDPOINT:', process.env.RUNPOD_VOICE_TRANSFER_ENDPOINT || 'MISSING');
  console.log('RUNPOD_BASE_URL:', process.env.RUNPOD_BASE_URL || 'MISSING');
  
  // API Endpoints
  console.log('🌐 [API ENDPOINTS] Environment Variables:');
  console.log('DEEPSEEK_API_ENDPOINT:', process.env.DEEPSEEK_API_ENDPOINT || 'MISSING');
  console.log('NEXT_PUBLIC_DEEPSEEK_API_ENDPOINT:', process.env.NEXT_PUBLIC_DEEPSEEK_API_ENDPOINT || 'MISSING');
  
  // App URL
  console.log('🔗 [APP URL] Environment Variables:');
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'MISSING');
  
  // Stripe
  console.log('💳 [STRIPE] Environment Variables:');
  console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...` : 'MISSING');
  console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 10)}...` : 'MISSING');
  console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? `${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10)}...` : 'MISSING');
  
  // Stripe Price IDs
  console.log('💰 [STRIPE PRICES] Environment Variables:');
  console.log('STRIPE_PRICE_SOLO:', process.env.STRIPE_PRICE_SOLO || 'MISSING');
  console.log('STRIPE_PRICE_TEAM:', process.env.STRIPE_PRICE_TEAM || 'MISSING');
  console.log('STRIPE_PRICE_AGENCY:', process.env.STRIPE_PRICE_AGENCY || 'MISSING');
  console.log('STRIPE_PRICE_TRANSCRIPTION_ONLY:', process.env.STRIPE_PRICE_TRANSCRIPTION_ONLY || 'MISSING');
  console.log('STRIPE_PRICE_CREATOR:', process.env.STRIPE_PRICE_CREATOR || 'MISSING');
  console.log('STRIPE_PRICE_PRO:', process.env.STRIPE_PRICE_PRO || 'MISSING');
  console.log('STRIPE_PRICE_STUDIO:', process.env.STRIPE_PRICE_STUDIO || 'MISSING');
  console.log('STRIPE_PRICE_BOOST_5K:', process.env.STRIPE_PRICE_BOOST_5K || 'MISSING');
  console.log('STRIPE_PRICE_BOOST_10K:', process.env.STRIPE_PRICE_BOOST_10K || 'MISSING');
  console.log('STRIPE_PRICE_BOOST_50K:', process.env.STRIPE_PRICE_BOOST_50K || 'MISSING');
  console.log('NEXT_PUBLIC_STRIPE_PRICE_SOLO:', process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO || 'MISSING');
  console.log('NEXT_PUBLIC_STRIPE_PRICE_TEAM:', process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM || 'MISSING');
  console.log('NEXT_PUBLIC_STRIPE_PRICE_AGENCY:', process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || 'MISSING');
  
  // Admin
  console.log('👑 [ADMIN] Environment Variables:');
  console.log('ADMIN_EMAILS:', process.env.ADMIN_EMAILS || 'MISSING');
  console.log('NEXT_PUBLIC_ADMIN_EMAILS:', process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'MISSING');
  
  // Environment
  console.log('🌍 [ENVIRONMENT] Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'MISSING');
  
  console.log('🔍 ===== END COMPREHENSIVE ENVIRONMENT VARIABLES DEBUG =====');
}

// Extract env vars to constants to ensure Next.js embeds them in client bundle
const NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
const NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
const NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';
const NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '';

const firebaseConfig = {
  apiKey: NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  // Note: Firestore doesn't need databaseURL - it's automatically derived from projectId
};

// Validate required Firebase configuration
// Note: NEXT_PUBLIC_ variables are embedded at build time in Next.js
// During development, they're loaded from .env.local
const requiredFirebaseFields = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

// Debug: Log all environment variables at runtime to see what's available
if (typeof window !== 'undefined') {
  console.log('🔍 [DEBUG] Runtime Environment Variables Check:');
  console.log('================================================');
  
  // Check all Firebase variables
  const firebaseVars = {
    'NEXT_PUBLIC_FIREBASE_API_KEY': NEXT_PUBLIC_FIREBASE_API_KEY,
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID': NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    'NEXT_PUBLIC_FIREBASE_APP_ID': NEXT_PUBLIC_FIREBASE_APP_ID,
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID': NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  Object.entries(firebaseVars).forEach(([key, value]) => {
    const status = value && value.trim() ? '✅' : '❌';
    const preview = value ? (value.length > 20 ? `${value.substring(0, 20)}...` : value) : 'MISSING';
    console.log(`${status} ${key}: ${preview}`);
  });

  // Check other NEXT_PUBLIC_ variables
  console.log('\n🔍 [DEBUG] Other NEXT_PUBLIC_ Variables:');
  console.log('================================================');
  const otherVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_DEEPSEEK_API_KEY',
    'NEXT_PUBLIC_DEEPSEEK_API_ENDPOINT',
    'NEXT_PUBLIC_ADMIN_EMAILS',
  ];

  otherVars.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅' : '❌';
    const preview = value ? (value.length > 20 ? `${value.substring(0, 20)}...` : value) : 'MISSING';
    console.log(`${status} ${key}: ${preview}`);
  });

  console.log('\n🔍 [DEBUG] Direct process.env check:');
  console.log('================================================');
  console.log('process.env.NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log('process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log('process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('================================================\n');

  // Validate Firebase environment variables on client-side before initialization
  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID
  };

  const missingFields = Object.entries(envVars)
    .filter(([key, value]) => !value || value.trim() === '')
    .map(([key]) => key);

  if (missingFields.length > 0) {
    console.error('🔴 Missing Firebase environment variables:', missingFields.join(', '));
    console.error('🔍 Verify variables are set in Vercel Dashboard → Settings → Environment Variables');
    console.error('🔍 Make sure they are enabled for PRODUCTION and trigger a new deployment');
    throw new Error(`Missing required Firebase environment variables: ${missingFields.join(', ')}`);
  }
}

// Initialize Firebase (works on both server and client)
// Server-side: API routes need Firebase, and env vars are available there
// Client-side: NEXT_PUBLIC_ vars are embedded at build time
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app, 'ttss'); // Use the correct database name 'ttss'

export default app;
