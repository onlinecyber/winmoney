import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { ref, get }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

import "./toast.js";
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const snap = await get(ref(db, `users/${user.uid}`));
  if (!snap.exists()) return;

  const data = snap.val();
  const refCode = data.referralCode || "----";

  // show referral code
  document.getElementById("refCode").innerText = refCode;

  // invite link
  const inviteLink =
    `${window.location.origin}/register.html?ref=${refCode}`;

  document.getElementById("inviteLink").innerText = inviteLink;

  // stats
  let count = 0;
  if (data.referrals) {
    if (typeof data.referrals === 'object') {
      count = Number(data.referrals.count) || 0;
    } else if (typeof data.referrals === 'number') {
      count = data.referrals;
    }
  }

  // Fallback to history length if count is 0
  if (count === 0 && data.referralHistory) {
    count = Object.keys(data.referralHistory).length;
  }

  document.getElementById("inviteCount").innerText = count;

  document.getElementById("reward").innerText =
    data.referrals?.reward || 0;

  // 📜 LOAD REFERRAL HISTORY
  const historyContainer = document.getElementById("referralHistory");
  const referralHistory = data.referralHistory || {};
  const historyItems = Object.values(referralHistory);

  if (historyItems.length > 0 && historyContainer) {
    // Sort by date (newest first)
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
  }
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
  const refCode =
    document.getElementById("refCode").innerText;

  const inviteLink =
    document.getElementById("inviteLink").innerText;

  const message =
    `🔥 Join this app & earn money!

💰 Get rewards after first recharge
🤝 Use my referral code: ${refCode}

👉 Sign up here:
${inviteLink}`;

  const url =
    "https://wa.me/?text=" + encodeURIComponent(message);

  window.open(url, "_blank");
};

