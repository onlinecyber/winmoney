// firebase.js (FINAL VERSION)

// Firebase SDKs (CDN – browser ke liye best)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// 🔥 Firebase Configuration (ONLY ONE PLACE)
const firebaseConfig = {
  apiKey: "AIzaSyDhqg9EX54By6H73ELA2KYfWPrW12fKzKw",
  authDomain: "dream-money-b68d8.firebaseapp.com",
  databaseURL: "https://dream-money-b68d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dream-money-b68d8",
  storageBucket: "dream-money-b68d8.appspot.com", // ✅ correct
  messagingSenderId: "758736283682",
  appId: "1:758736283682:web:00fc1ad62115ba69de027b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getDatabase(app);
