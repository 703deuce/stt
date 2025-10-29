import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
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

// Validate Firebase environment variables
// Only validate on client-side to avoid server-side issues
// NEXT_PUBLIC_ variables are embedded at build time for client bundle
const validateFirebaseConfig = () => {
  // Only validate on client-side
  if (typeof window === 'undefined') {
    return; // Skip validation on server
  }

  const missingFields = requiredFirebaseFields.filter(field => {
    const value = process.env[field];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  if (missingFields.length > 0) {
    console.error('🔴 Missing Firebase environment variables:', missingFields.join(', '));
    console.error('🔍 Verify variables are set in Vercel Dashboard → Settings → Environment Variables');
    console.error('🔍 Make sure they are enabled for PRODUCTION and trigger a new deployment');
    throw new Error(`Missing required Firebase environment variables: ${missingFields.join(', ')}`);
  }
};

// Run validation on client-side only
if (typeof window !== 'undefined') {
  validateFirebaseConfig();
}

// Initialize Firebase
// Only initialize on client-side; server imports will handle this gracefully
const app = typeof window !== 'undefined' ? initializeApp(firebaseConfig) : null as any;

// Initialize Firebase Storage
export const storage = typeof window !== 'undefined' && app ? getStorage(app) : null as any;

// Initialize Firebase Auth
export const auth = typeof window !== 'undefined' && app ? getAuth(app) : null as any;

// Initialize Firestore
export const db = typeof window !== 'undefined' && app ? getFirestore(app, 'ttss') : null as any;

export default app;
