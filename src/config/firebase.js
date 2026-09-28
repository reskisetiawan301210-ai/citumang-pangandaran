/**
 * Firebase Configuration
 * Konfigurasi Firebase untuk autentikasi admin dan database Firestore.
 * Semua nilai diambil dari environment variables (.env / Vercel Environment Variables).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const rawConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Bersihkan spasi jika ada
export const firebaseConfig = {
  apiKey: typeof rawConfig.apiKey === 'string' ? rawConfig.apiKey.trim() : '',
  authDomain: typeof rawConfig.authDomain === 'string' ? rawConfig.authDomain.trim() : '',
  projectId: typeof rawConfig.projectId === 'string' ? rawConfig.projectId.trim() : '',
  storageBucket: typeof rawConfig.storageBucket === 'string' ? rawConfig.storageBucket.trim() : '',
  messagingSenderId: typeof rawConfig.messagingSenderId === 'string' ? rawConfig.messagingSenderId.trim() : '',
  appId: typeof rawConfig.appId === 'string' ? rawConfig.appId.trim() : ''
};

export function checkFirebaseEnv() {
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');
  return {
    isComplete: missing.length === 0,
    missing
  };
}

let app = null;
let auth = null;
let db = null;
let initError = null;

const envCheck = checkFirebaseEnv();

if (!envCheck.isComplete) {
  initError = new Error(
    `Konfigurasi Firebase belum lengkap. Environment variable yang belum diatur: ${envCheck.missing.join(', ')}`
  );
  console.warn('[Firebase Config]', initError.message);
} else {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    initError = err;
    console.error('[Firebase Init Error]:', err);
  }
}

export { app, auth, db, initError };
export const isFirebaseReady = Boolean(app && auth && !initError);
export default app;
