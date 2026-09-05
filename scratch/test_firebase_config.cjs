/**
 * Test Firebase Configuration Integration
 */
const { initializeApp, getApps } = require('firebase/app');
const { getAuth } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyDzBC4GLKXN3_lyh91B0NY4FcHH6x_hIEw",
  authDomain: "otp-site-80c03.firebaseapp.com",
  projectId: "otp-site-80c03",
  storageBucket: "otp-site-80c03.firebasestorage.app",
  messagingSenderId: "419034737047",
  appId: "1:419034737047:web:136ccc97ec4d1275c8bcd2",
  measurementId: "G-Y944D6CF9C"
};

console.log('Testing Firebase Initialization with project otp-site-80c03...');
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
console.log('✅ Firebase App initialized:', app.name, 'for project:', app.options.projectId);

const auth = getAuth(app);
console.log('✅ Firebase Auth instance initialized for domain:', auth.config.authDomain);
console.log('🎉 Firebase configuration test passed successfully!');
