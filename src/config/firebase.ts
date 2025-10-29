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
// Next.js/Turbopack embeds NEXT_PUBLIC_ variables at build time
// In development, they're loaded from .env.local when the server starts
const missingFields = requiredFirebaseFields.filter(field => {
  const value = process.env[field];
  // Check if value exists and is not just whitespace
  return !value || value.trim() === '';
});

if (missingFields.length > 0) {
  const errorMessage = `
Missing required Firebase environment variables: ${missingFields.join(', ')}

TROUBLESHOOTING:
1. Make sure .env.local exists in transcription-app/ (same level as package.json)
2. Stop the dev server (Ctrl+C)  
3. Clear cache: Remove-Item -Recurse -Force .next
4. Restart: npm run dev

Variables needed:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Note: If you see this after restarting, check that .env.local has all variables
and there are no spaces around the = sign.
`;
  console.error(errorMessage);
  throw new Error(`Missing required Firebase environment variables: ${missingFields.join(', ')}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app, 'ttss'); // Use the correct database name 'ttss'

export default app;
