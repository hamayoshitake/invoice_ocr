// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAnC6C9ax3ENrRVMpQ2zqPtqhb3kORytc0",
  authDomain: "invoice-ocr-app-668f6.firebaseapp.com",
  projectId: "invoice-ocr-app-668f6",
  storageBucket: "invoice-ocr-app-668f6.firebasestorage.app",
  messagingSenderId: "757455766131",
  appId: "1:757455766131:web:80b0d86a7791b4071fe006",
  measurementId: "G-5RR4PK4VB2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);