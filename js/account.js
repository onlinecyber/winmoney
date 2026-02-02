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

    // Set avatar letter (first character of name)
    const avatarEl = document.getElementById("userAvatar");
    if (avatarEl && data.name) {
      avatarEl.innerText = data.name.charAt(0).toUpperCase();
    }

    // Set user ID (first 8 chars of uid)
    const userIdEl = document.getElementById("userId");
    if (userIdEl) userIdEl.innerText = "ID: " + uid.substring(0, 8).toUpperCase();

    // 🔥 VIP LEVEL CALCULATION (Based on Total Investment)
    const totalInvested = Number(data.stats?.totalInvested || 0);

    // VIP Levels:
    // VIP 0: ₹0 - ₹999
    // VIP 1: ₹1,000 - ₹4,999
    // VIP 2: ₹5,000 - ₹14,999
    // VIP 3: ₹15,000 - ₹49,999
    // VIP 4: ₹50,000+

    let vipLevel = 0;
    let nextThreshold = 1000;
    let progressPercent = 0;

    if (totalInvested >= 50000) {
      vipLevel = 4;
      progressPercent = 100;
    } else if (totalInvested >= 15000) {
      vipLevel = 3;
      nextThreshold = 50000;
      progressPercent = ((totalInvested - 15000) / (50000 - 15000)) * 100;
    } else if (totalInvested >= 5000) {
      vipLevel = 2;
      nextThreshold = 15000;
      progressPercent = ((totalInvested - 5000) / (15000 - 5000)) * 100;
    } else if (totalInvested >= 1000) {
      vipLevel = 1;
      nextThreshold = 5000;
      progressPercent = ((totalInvested - 1000) / (5000 - 1000)) * 100;
    } else {
      vipLevel = 0;
      nextThreshold = 1000;
      progressPercent = (totalInvested / 1000) * 100;
    }

    // Update VIP display
    const vipLevelEl = document.querySelector(".vip-level");
    if (vipLevelEl) vipLevelEl.innerText = "VIP " + vipLevel;

    const vipBarEl = document.getElementById("vipBar");
    if (vipBarEl) vipBarEl.style.width = Math.min(progressPercent, 100) + "%";

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

/* ================= BANNER SLIDER ================= */
let currentSlide = 0;
const slides = document.querySelectorAll('.banner-slide');
const dotsContainer = document.getElementById('bannerDots');

// Create dots
slides.forEach((_, index) => {
  const dot = document.createElement('div');
  dot.classList.add('banner-dot');
  if (index === 0) dot.classList.add('active');
  dot.addEventListener('click', () => goToSlide(index));
  dotsContainer.appendChild(dot);
});

const dots = document.querySelectorAll('.banner-dot');

function goToSlide(n) {
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');

  currentSlide = n;
  if (currentSlide >= slides.length) currentSlide = 0;
  if (currentSlide < 0) currentSlide = slides.length - 1;

  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function nextSlide() {
  goToSlide(currentSlide + 1);
}

// Auto-slide every 3 seconds
setInterval(nextSlide, 3000);
