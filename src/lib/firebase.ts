// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "academic-sentinel-k0p7f",
  "appId": "1:285898644669:web:a8dfb63bb5bb7a86c2abd4",
  "storageBucket": "academic-sentinel-k0p7f.firebasestorage.app",
  "apiKey": "AIzaSyCxDL06skjqZnF5rg5_k9_qu1Y9Gk2cNRk",
  "authDomain": "academic-sentinel-k0p7f.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "285898644669"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db);
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn(
        'Multiple tabs open, persistence can only be enabled in one tab at a a time.'
      );
    } else if (err.code === 'unimplemented') {
      console.warn(
        'The current browser does not support all of the features required to enable persistence.'
      );
    }
  }
}


export { app, db };
