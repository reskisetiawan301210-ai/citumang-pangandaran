/**
 * Firebase Configuration
 * Konfigurasi Firebase untuk autentikasi admin, database Firestore, dan Firebase Storage.
 * Semua nilai diambil dari environment variables (.env / Vercel Environment Variables).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
let storage = null;
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
    try {
      storage = getStorage(app);
    } catch (storageErr) {
      console.warn('[Firebase Storage Warn]:', storageErr.message);
    }
  } catch (err) {
    initError = err;
    console.error('[Firebase Init Error]:', err);
  }
}

/**
 * Upload file gambar langsung ke Firebase Storage
 * @param {File} file - File gambar dari input file
 * @param {string} folder - Folder tujuan (default: 'citumang')
 * @returns {Promise<string>} Download URL permanen dari Firebase Storage
 */
export async function uploadImageToStorage(file, folder = 'citumang') {
  if (!storage) {
    throw new Error('Firebase Storage belum aktif atau belum terkonfigurasi. Pastikan VITE_FIREBASE_STORAGE_BUCKET sudah diatur di environment variable.');
  }
  if (!file) {
    throw new Error('File gambar belum dipilih.');
  }

  // Validasi ukuran: max 10MB
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ukuran file maksimal adalah 10MB.');
  }

  // Nama file unik dengan timestamp
  const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const cleanBase = file.name ? file.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30) : 'image';
  const fileName = `${Date.now()}_${cleanBase}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  const storageRef = ref(storage, filePath);
  const metadata = {
    contentType: file.type || 'image/jpeg',
    customMetadata: {
      uploadedAt: new Date().toISOString()
    }
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

export { app, auth, db, storage, initError };
export const isFirebaseReady = Boolean(app && auth && !initError);
export default app;
