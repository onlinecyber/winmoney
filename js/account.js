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

  // 🔥 LOAD USER NAME
  onValue(userRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.val();

    // Set username
    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.innerText = data.name || "User";

    // Set avatar letter
    const avatarEl = document.getElementById("userAvatar");
    if (avatarEl && data.name) {
      avatarEl.innerText = data.name.charAt(0).toUpperCase();
    }

    // VIP Level Logic
    const totalInvested = Number(data.stats?.totalInvested || 0);
    let vipLevel = 0;
    let progressPercent = 0;

    if (totalInvested >= 50000) vipLevel = 4, progressPercent = 100;
    else if (totalInvested >= 15000) {
      vipLevel = 3;
      progressPercent = ((totalInvested - 15000) / (35000)) * 100;
    } else if (totalInvested >= 5000) {
      vipLevel = 2;
      progressPercent = ((totalInvested - 5000) / (10000)) * 100;
    } else if (totalInvested >= 1000) {
      vipLevel = 1;
      progressPercent = ((totalInvested - 1000) / (4000)) * 100;
    } else {
      vipLevel = 0;
      progressPercent = (totalInvested / 1000) * 100;
    }

    const vipLevelEl = document.querySelector(".vip-level");
    if (vipLevelEl) vipLevelEl.innerText = "VIP " + vipLevel;

    const vipBarEl = document.getElementById("vipBar");
    if (vipBarEl) vipBarEl.style.width = Math.min(progressPercent, 100) + "%";

    // ✅ LOAD DASHBOARD STATS (Referrals)
    const refEl = document.getElementById("dashInviteCount");
    if (refEl) {
      let count = 0;
      if (data.referrals) {
        if (typeof data.referrals === 'object') {
          count = Number(data.referrals.count);
          if (isNaN(count) || count === 0) {
            count = Object.keys(data.referrals).filter(k => k !== 'count' && k !== 'reward').length;
          }
        } else if (typeof data.referrals === 'number') {
          count = data.referrals;
        }
      }
      if (!count && data.referralHistory) {
        count = Object.keys(data.referralHistory).length;
      }
      refEl.innerText = count || 0;
    }

    const bonusEl = document.getElementById("dashBonus");
    if (bonusEl) {
      bonusEl.innerText = "₹" + (data.referrals?.reward || 0);
    }
  });

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

/* ================= BANNER SLIDER ================= */
let currentSlide = 0;
const slides = document.querySelectorAll('.banner-slide');
const dotsContainer = document.getElementById('bannerDots');

// Create dots
if (dotsContainer && slides.length > 0) {
  slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.classList.add('banner-dot');
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });
}

const dots = document.querySelectorAll('.banner-dot');

function goToSlide(n) {
  if (slides.length === 0) return;
  slides[currentSlide].classList.remove('active');
  if (dots.length > 0) dots[currentSlide].classList.remove('active');

  currentSlide = n;
  if (currentSlide >= slides.length) currentSlide = 0;
  if (currentSlide < 0) currentSlide = slides.length - 1;

  slides[currentSlide].classList.add('active');
  if (dots.length > 0) dots[currentSlide].classList.add('active');
}

function nextSlide() {
  goToSlide(currentSlide + 1);
}

// Auto-slide every 3 seconds
setInterval(nextSlide, 3000);


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

  // Update streak display in modal
  const streakCountEl = document.getElementById('streakCount');
  if (streakCountEl) streakCountEl.textContent = streak;

  // Check if can check-in today
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const timeSinceLastCheckin = now - lastCheckin;

  if (timeSinceLastCheckin < oneDay) {
    // Already checked in today
    const btn = document.getElementById('checkinBtnModal');
    const btnText = document.getElementById('checkinBtnText');
    const status = document.getElementById('checkinStatus');

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = '✓ Already Checked In';

    const hoursLeft = Math.ceil((oneDay - timeSinceLastCheckin) / (60 * 60 * 1000));
    if (status) status.textContent = `Come back in ${hoursLeft} hours`;
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

    // Save to incomeHistory for total earnings
    const incomeRef = ref(db, `incomeHistory/${checkinUser.uid}/${Date.now()}`);
    await set(incomeRef, {
      type: 'checkin',
      amount: reward,
      description: newStreak === 7 ? '7-Day Streak Bonus' : 'Daily Check-in',
      date: Date.now()
    });

    // Update UI
    const streakCountEl = document.getElementById('streakCount');
    if (streakCountEl) streakCountEl.textContent = newStreak;

    const btn = document.getElementById('checkinBtnModal');
    const btnText = document.getElementById('checkinBtnText');
    const status = document.getElementById('checkinStatus');

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = '✓ Checked In!';
    if (status) status.textContent = 'Come back in 24 hours';

    // Celebration animation on modal
    const modal = document.getElementById('checkinModal');
    if (modal) modal.classList.add('celebrate');
    setTimeout(() => {
      if (modal) modal.classList.remove('celebrate');
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

/* ================= CHECK-IN MODAL ================= */
window.openCheckinModal = function () {
  const modal = document.getElementById('checkinModal');
  if (modal) modal.classList.add('show');
  loadCheckinStatus(); // Refresh status when opening
};

window.closeCheckinModal = function () {
  const modal = document.getElementById('checkinModal');
  if (modal) modal.classList.remove('show');
};

// Add event listener for check-in nav button
document.addEventListener('DOMContentLoaded', () => {
  const checkinNavBtn = document.getElementById('checkinNavBtn');
  if (checkinNavBtn) {
    checkinNavBtn.addEventListener('click', window.openCheckinModal);
  }
});

/* ================= LIVE TRANSACTION FEED ================= */
const feedTicker = document.getElementById('feedTicker2');

// Action mappings
const actionMap = {
  'earned': { emoji: '🎉', text: 'just earned' },
  'withdrew': { emoji: '💰', text: 'withdrew' },
  'invested': { emoji: '📈', text: 'invested' },
  'referred': { emoji: '🎁', text: 'referred & earned' }
};

// Load feed from Firebase
function loadLiveFeed() {
  onValue(ref(db, 'liveFeed'), (snap) => {
    if (!feedTicker) return;

    if (!snap.exists()) {
      // No admin messages, show default
      feedTicker.innerHTML = '<span class="feed-item">🎉 Welcome to Dream Money! Start investing today!</span>';
      return;
    }

    let feedHTML = '';
    snap.forEach(child => {
      const f = child.val();
      const action = actionMap[f.action] || actionMap['earned'];
      feedHTML += `<span class="feed-item">${action.emoji} ${f.name} from ${f.city} ${action.text} ₹${Number(f.amount).toLocaleString()}!</span>`;
    });

    // Duplicate for seamless loop animation
    feedTicker.innerHTML = feedHTML + feedHTML;
  });
}

loadLiveFeed();
