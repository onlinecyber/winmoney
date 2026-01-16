// firebase.js (FINAL VERSION)

// Firebase SDKs (CDN – browser ke liye best)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// 🔥 Firebase Configuration (NEW PROJECT)
const firebaseConfig = {
  apiKey: "AIzaSyBA0BP5Tw3QdlLEI7DMcBr9OVIKTIsMYiY",
  authDomain: "online-73c00.firebaseapp.com",
  databaseURL: "https://online-73c00-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "online-73c00",
  storageBucket: "online-73c00.firebasestorage.app",
  messagingSenderId: "906312941692",
  appId: "1:906312941692:web:addfe47c4827c740f649f9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getDatabase(app);
