// src/lib/firebase-client.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig';

let firebaseApp: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApps()[0];
  }
  return firebaseApp;
}
