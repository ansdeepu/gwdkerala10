// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// These environment variables need to be set in your .env file.
// You can find these values in your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyAySb23iBvJgo6jjXqSavfGTKrOHiuVZRc",
  authDomain: "gwd-kerala-bc80e.firebaseapp.com",
  projectId: "gwd-kerala-bc80e",
  storageBucket: "gwd-kerala-bc80e.firebasestorage.app",
  messagingSenderId: "845907959817",
  appId: "1:845907959817:web:695feb71edb1067cf198d8"
};

// Initialize Firebase
// We check if apps are already initialized to prevent errors during hot reloading in development.
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Initialize Firestore with client-side multi-tab persistence
let db: Firestore;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn("Failed to initialize Firestore with persistent local cache, falling back to standard:", error);
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

// Initialize Auth with explicit local persistence
const auth: Auth = getAuth(app);
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.error("Firebase setPersistence error:", err);
  });
}

const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage /*, analytics */ };
