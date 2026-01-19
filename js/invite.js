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
  document.getElementById("inviteCount").innerText =
    data.referrals?.count || 0;

  document.getElementById("reward").innerText =
    data.referrals?.reward || 0;
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

