import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  set,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

/* ================= REGISTER ================= */
window.registerUser = async function () {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const txPassword = document.getElementById("txPassword").value;
  const inputRefCode =
    document.getElementById("refCode")?.value.trim() || null;

  if (!name || !phone || !password || !txPassword) {
    alert("Please fill all fields");
    return;
  }

  if (phone.length < 10) {
    alert("Enter valid phone number");
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

    /* ✅ CREATE USER (NO REWARD HERE) */
    await set(ref(db, "users/" + uid), {
      name,
      phone,
      txPassword,
      role: "user",
      status: "active",

      wallets: {
        withdraw: 0
      },

      referralCode,
      referredBy: inputRefCode, // 🔥 stored only
      referrals: {
        count: 0,
        reward: 0
      },

      createdAt: Date.now()
    });

    alert("Register successful");
    window.location.href = "/account.html";

  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      alert("Number already registered. Please login.");
      window.location.href = "/index.html";
    } else if (err.code === "auth/weak-password") {
      alert("Password must be at least 6 characters");
    } else {
      alert(err.message);
    }
  }
};

/* ================= LOGIN ================= */
window.loginUser = async function () {
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;

  if (!phone || !password) {
    alert("Fill all fields");
    return;
  }

  const email = phoneToEmail(phone);

  try {
    const cred =
      await signInWithEmailAndPassword(auth, email, password);

    const snap = await get(ref(db, "users/" + cred.user.uid));
    if (!snap.exists() || snap.val().status !== "active") {
      alert("Account blocked");
      return;
    }

    window.location.href = "/account.html";

  } catch (err) {
    alert("Invalid phone number or password");
  }
};
