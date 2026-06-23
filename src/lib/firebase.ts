// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// To use Analytics: import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

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

// Initialize Firestore
const db: Firestore = getFirestore(app);

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

// Example for Firebase Analytics (optional):
// let analytics: Analytics | undefined;
// if (typeof window !== 'undefined') { // Ensure it runs only on the client
//   isSupported().then(yes => { // Check if Firebase Analytics is supported in the current environment
//     if (yes) {
//       analytics = getAnalytics(app);
//     }
//   });
// }

export { app, auth, db, storage /*, analytics */ };
