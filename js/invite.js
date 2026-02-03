import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { ref, get, onValue }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

import "./toast.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userRef = ref(db, `users/${user.uid}`);

  // Use persistent listener for realtime stats
  onValue(userRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.val();
    const refCode = data.referralCode || "----";

    // Show referral code
    document.getElementById("refCode").innerText = refCode;

    // Build invite link
    const inviteLink = `${window.location.origin}/register.html?ref=${refCode}`;
    document.getElementById("inviteLink").innerText = inviteLink;

    // Referral Count (Signups)
    let count = 0;
    if (data.referrals) {
      count = Number(data.referrals.total || data.referrals.count || 0);
      if (count === 0 && typeof data.referrals === 'object') {
        count = Object.keys(data.referrals).filter(k => k !== 'count' && k !== 'reward' && k !== 'total').length;
      }
    }
    const countEl = document.getElementById("inviteCount");
    if (countEl) countEl.innerText = count || 0;

    // Reward amount (from recharges)
    const rewardEl = document.getElementById("reward");
    if (rewardEl) rewardEl.innerText = data.referrals?.reward || 0;

    // 📜 LOAD REFERRAL HISTORY
    const historyContainer = document.getElementById("referralHistory");
    if (historyContainer) {
      const referralHistory = data.referralHistory || {};
      const historyItems = Object.values(referralHistory);

      if (historyItems.length > 0) {
        historyItems.sort((a, b) => b.createdAt - a.createdAt);
        historyContainer.innerHTML = historyItems.map(item => {
          const date = new Date(item.createdAt);
          const dateStr = date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          return `
            <div class="history-item">
              <div class="history-left">
                <span class="history-name">${item.referredUserName || 'User'}</span>
                <span class="history-date">${dateStr}</span>
              </div>
              <span class="history-amount">+₹${item.rewardAmount}</span>
            </div>
          `;
        }).join('');
      } else {
        historyContainer.innerHTML = '<p class="empty-text">No rewarded referrals yet</p>';
      }
    }
  });
});

/* COPY FUNCTIONS */
window.copyRefCode = function () {
  const text = document.getElementById("refCode").innerText;
  navigator.clipboard.writeText(text);
  toastSuccess("Referral code copied!");
};

window.copyInviteLink = function () {
  const text = document.getElementById("inviteLink").innerText;
  navigator.clipboard.writeText(text);
  toastSuccess("Invite link copied!");
};

window.shareWhatsApp = function () {
  const refCode = document.getElementById("refCode").innerText;
  const inviteLink = document.getElementById("inviteLink").innerText;

  const message = `🔥 Join this app & earn money!
💰 Welcome Bonus: ₹20 
🤝 Use my referral code: ${refCode}
👉 Sign up here: ${inviteLink}`;

  const url = "https://wa.me/?text=" + encodeURIComponent(message);
  window.open(url, "_blank");
};
