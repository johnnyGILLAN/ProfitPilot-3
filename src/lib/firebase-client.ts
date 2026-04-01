import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initFirebase() {
  try {
    if (!getApps() || getApps().length === 0) {
      initializeApp(firebaseConfig);
    } else {
      getApp();
    }
  } catch (e) {
    // ignore
  }
  return getAuth();
}

export const firebaseAuth = initFirebase();
