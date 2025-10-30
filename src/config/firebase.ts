import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
