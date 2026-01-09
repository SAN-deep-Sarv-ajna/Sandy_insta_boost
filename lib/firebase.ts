import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG FROM CONSOLE.FIREBASE.GOOGLE.COM
// ideally these should be in .env files (VITE_FIREBASE_API_KEY, etc.)

// Cast import.meta to any to resolve TypeScript error regarding env property
// Added fallback || {} to prevent crash if env is undefined
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Debugging Helper: Check if keys are loaded
if (!firebaseConfig.apiKey) {
  console.error("🔥 FIREBASE ERROR: API Key is missing!");
  console.error("If you are on Vercel, go to Settings > Environment Variables and add 'VITE_FIREBASE_API_KEY'.");
  console.log("Current Config:", firebaseConfig);
}

// Initialize Firebase only if config is present to prevent crashes during setup
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : undefined;

export const auth = app ? getAuth(app) : undefined;
export const db = app ? getFirestore(app) : undefined;
export const googleProvider = new GoogleAuthProvider();