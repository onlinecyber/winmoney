import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  ref,
  set,
  get
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

import "./toast.js";

/* helper: phone -> fake email */
function phoneToEmail(phone) {
  return phone + "@app.com";
}

/* ================= AUTO REFERRAL FROM URL (SAFE) ================= */
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const autoRefCode = params.get("ref");

  if (typeof autoRefCode === "string" && autoRefCode.length > 0) {
    const refInput = document.getElementById("refCode");
    if (refInput) {
      refInput.value = autoRefCode;
    }
  }
});

/* ================= SHA-256 HASH FUNCTION ================= */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/* ================= REGISTER ================= */
window.registerUser = async function () {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const txPassword = document.getElementById("txPassword").value;
  const inputRefCode =
    document.getElementById("refCode")?.value.trim() || null;

  if (!name || !phone || !password || !txPassword) {
    toastWarning("Please fill all fields");
    return;
  }

  if (phone.length < 10) {
    toastWarning("Enter valid phone number");
    return;
  }

  const email = phoneToEmail(phone);

  try {
    const cred =
      await createUserWithEmailAndPassword(auth, email, password);

    const uid = cred.user.uid;

    /* 🔥 generate referral code */
    const referralCode =
      "REF" + Math.random().toString(36).substring(2, 8).toUpperCase();

    /* 🔐 Hash transaction password */
    const hashedTxPassword = await hashPassword(txPassword);

    /* 🎁 SIGNUP BONUS */
    const SIGNUP_BONUS = 20; // ₹20 welcome bonus

    /* ✅ CREATE USER WITH SIGNUP BONUS */
    await set(ref(db, "users/" + uid), {
      name,
      phone,
      txPassword: hashedTxPassword, // 🔐 Stored as hash
      role: "user",
      status: "active",

      wallets: {
        deposit: 0,
        withdraw: SIGNUP_BONUS // 🎁 ₹20 signup bonus
      },

      referralCode,
      referredBy: inputRefCode, // 🔥 stored only
      referrals: {
        count: 0,
        reward: 0
      },

      createdAt: Date.now()
    });


    toastSuccess("Registration successful!");
    window.location.href = "/account.html";

  } catch (err) {
    console.error("❌ Registration Error:", err);
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);

    if (err.code === "auth/email-already-in-use") {
      toastWarning("Number already registered");
      setTimeout(() => { window.location.href = "/index.html"; }, 1500);
    } else if (err.code === "auth/weak-password") {
      toastError("Password must be at least 6 characters");
    } else if (err.code === "auth/network-request-failed") {
      toastError("Network error. Check internet");
    } else {
      toastError("Registration failed");
    }
  }
};

/* ================= LOGIN ================= */
window.loginUser = async function () {
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;

  if (!phone || !password) {
    toastWarning("Fill all fields");
    return;
  }

  const email = phoneToEmail(phone);

  try {
    const cred =
      await signInWithEmailAndPassword(auth, email, password);

    const snap = await get(ref(db, "users/" + cred.user.uid));
    if (!snap.exists() || snap.val().status !== "active") {
      toastError("Account blocked");
      return;
    }

    window.location.href = "/account.html";

  } catch (err) {
    toastError("Invalid phone or password");
  }
};
