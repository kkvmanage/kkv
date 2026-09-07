/**
 * Test Firebase Configuration Integration
 */
const { initializeApp, getApps } = require('firebase/app');
const { getAuth } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyC0z5G3MAStIA88bRhQlbTzG2TWvEnc-Vg",
  authDomain: "kkv-gold-finance.firebaseapp.com",
  projectId: "kkv-gold-finance",
  storageBucket: "kkv-gold-finance.firebasestorage.app",
  messagingSenderId: "1078096093903",
  appId: "1:1078096093903:web:74480b31fca9d9adec4dba",
  measurementId: "G-8DVJ631E0Y"
};

console.log('Testing Firebase Initialization with project kkv-gold-finance...');
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
console.log('✅ Firebase App initialized:', app.name, 'for project:', app.options.projectId);

const auth = getAuth(app);
console.log('✅ Firebase Auth instance initialized for domain:', auth.config.authDomain);
console.log('🎉 Firebase configuration test passed successfully!');
