import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  ref,
  onValue,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* ================= GLOBAL WALLET ================= */
window.userWallet = {
  deposit: 0,
  withdraw: 0
};

/* ================= AUTH + WALLET SYNC ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  const uid = user.uid;
  const userRef = ref(db, `users/${uid}`);
  const walletsRef = ref(db, `users/${uid}/wallets`);

  // 🔥 LOAD USER NAME AND ID
  onValue(userRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.val();

    // Set username
    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.innerText = data.name || "User";

    // Set user ID (first 8 chars of uid)
    const userIdEl = document.getElementById("userId");
    if (userIdEl) userIdEl.innerText = "ID: " + uid.substring(0, 8).toUpperCase();
  }, { onlyOnce: true });

  // 🔥 ENSURE WALLET NODE EXISTS (VERY IMPORTANT)
  runTransaction(walletsRef, (w) => {
    if (!w || typeof w !== "object") {
      return {
        deposit: 0,
        withdraw: 0
      };
    }
    return {
      deposit: Number(w.deposit) || 0,
      withdraw: Number(w.withdraw) || 0
    };
  });

  // 🔥 REALTIME WALLET LISTENER
  onValue(walletsRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const w = snapshot.val();

    // ✅ SAVE GLOBALLY
    window.userWallet.deposit = Number(w.deposit) || 0;
    window.userWallet.withdraw = Number(w.withdraw) || 0;

    // ✅ UPDATE UI
    const depEl = document.getElementById("depositBal");
    if (depEl) depEl.innerText = "₹" + window.userWallet.deposit.toFixed(2);

    const witEl = document.getElementById("withdrawBal");
    if (witEl) witEl.innerText = "₹" + window.userWallet.withdraw.toFixed(2);

    // 🔁 BACKWARD COMPAT (old UI safety)
    const mainWallet = document.getElementById("mainWallet");
    if (mainWallet) mainWallet.innerText =
      window.userWallet.withdraw.toFixed(2);

    const withdrawWallet = document.getElementById("withdrawWallet");
    if (withdrawWallet) withdrawWallet.innerText =
      window.userWallet.withdraw.toFixed(2);

    console.log("✅ Wallet LIVE:", window.userWallet);
  });
});

/* ================= BANK CARD BUTTON ================= */
window.addEventListener("DOMContentLoaded", () => {
  const bankBtn = document.getElementById("bankCardBtn");
  if (bankBtn) {
    bankBtn.addEventListener("click", () => {
      location.href = "/bank-details.html";
    });
  }
});

/* ================= LOGOUT ================= */
window.logout = function () {
  signOut(auth).then(() => {
    location.href = "/index.html";
  });
};
