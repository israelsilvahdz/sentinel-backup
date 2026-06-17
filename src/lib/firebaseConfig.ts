// src/lib/firebaseConfig.ts
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCV7o_NfeFq1xT1nF1hBfXW8Gj-A9gW6tQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tecmilenio-mdea.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://tecmilenio-mdea-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tecmilenio-mdea",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tecmilenio-mdea.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "576664692340",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:576664692340:web:968f70092f6f4c3a4d5321"
};
