import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  ref,
  onValue,
  runTransaction,
  get,
  set
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

// Add logout event listener
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', window.logout);
  }
});


/* ================= DAILY CHECK-IN SYSTEM ================= */

let checkinUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    checkinUser = user;
    await loadCheckinStatus();
  }
});

async function loadCheckinStatus() {
  if (!checkinUser) return;

  const checkinRef = ref(db, `users/${checkinUser.uid}/checkin`);
  const snap = await get(checkinRef);
  const data = snap.val() || {};

  const streak = data.streak || 0;
  const lastCheckin = data.lastCheckin || 0;

  // Update streak display in compact badge
  document.getElementById('streakDisplay').textContent = `🔥 ${streak} days`;

  // Check if can check-in today
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const timeSinceLastCheckin = now - lastCheckin;

  if (timeSinceLastCheckin < oneDay) {
    // Already checked in today - disable badge
    const badge = document.getElementById('checkinCompact');
    badge.classList.add('disabled');
    badge.style.pointerEvents = 'none';
  }
}

// Add click event listener
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('checkinCompact');
  if (badge) {
    badge.addEventListener('click', window.dailyCheckin);
  }
});

window.dailyCheckin = async function () {
  if (!checkinUser) {
    toastError('Please login first');
    return;
  }

  const uid = checkinUser.uid;
  const checkinRef = ref(db, `users/${uid}/checkin`);
  const walletsRef = ref(db, `users/${uid}/wallets`);

  try {
    const checkinSnap = await get(checkinRef);
    const checkinData = checkinSnap.val() || {};

    const now = Date.now();
    const lastCheckin = checkinData.lastCheckin || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const twoDays = 2 * oneDay;

    // Check if already checked in today
    if (now - lastCheckin < oneDay) {
      toastWarning('Already checked in today!');
      return;
    }

    // Calculate new streak
    let newStreak = checkinData.streak || 0;
    if (now - lastCheckin < twoDays) {
      // Continued streak
      newStreak++;
    } else {
      // Streak broken, restart
      newStreak = 1;
    }

    // Base reward
    let reward = 5;

    // Bonus for 7-day streak
    if (newStreak === 7) {
      reward = 50; // Big bonus!
    }

    // Update check-in data
    await set(checkinRef, {
      lastCheckin: now,
      streak: newStreak,
      totalCheckins: (checkinData.totalCheckins || 0) + 1
    });

    // Add reward to withdraw wallet
    await runTransaction(walletsRef, (current) => {
      const wallets = current || { deposit: 0, withdraw: 0 };
      return {
        deposit: wallets.deposit || 0,
        withdraw: (wallets.withdraw || 0) + reward
      };
    });

    // Update UI
    document.getElementById('streakDisplay').textContent = `🔥 ${newStreak} days`;
    const badge = document.getElementById('checkinCompact');
    badge.classList.add('disabled');
    badge.style.pointerEvents = 'none';

    // Celebration animation on header
    document.querySelector('.header-section').classList.add('celebrate');
    setTimeout(() => {
      document.querySelector('.header-section').classList.remove('celebrate');
    }, 600);

    // Show success message
    if (newStreak === 7) {
      toastSuccess(`🎉 7-Day Streak! Earned ₹${reward}!`);
    } else {
      toastSuccess(`✅ Check-in successful! Earned ₹${reward}`);
    }

  } catch (error) {
    toastError('Check-in failed: ' + error.message);
  }
};

/* ================= LIVE TRANSACTION FEED ================= */
const feedTicker = document.getElementById('feedTicker');

const names = ['Rajesh', 'Priya', 'Amit', 'Neha', 'Vikram', 'Pooja', 'Rahul', 'Anjali', 'Suresh', 'Kavita'];
const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad'];
const actions = [
  { emoji: '🎉', text: 'just earned', min: 100, max: 5000 },
  { emoji: '💰', text: 'withdrew', min: 500, max: 10000 },
  { emoji: '📈', text: 'invested', min: 1000, max: 20000 }
];

function generateFeedMessage() {
  const name = names[Math.floor(Math.random() * names.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const amount = Math.floor(Math.random() * (action.max - action.min) + action.min);

  return `${action.emoji} ${name} from ${city} ${action.text} ₹${amount.toLocaleString()}!`;
}

// Generate multiple feed items for infinite scroll
function populateFeed() {
  let feedHTML = '';
  for (let i = 0; i < 10; i++) {
    feedHTML += `<span class="feed-item">${generateFeedMessage()}</span>`;
  }
  feedTicker.innerHTML = feedHTML + feedHTML; // Duplicate for seamless loop
}

populateFeed();

// Regenerate feed every 30 seconds for variety
setInterval(populateFeed, 30000);

