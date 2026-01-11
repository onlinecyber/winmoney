import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref,
  get,
  push,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

let currentUser = null;
let userTxPassword = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  currentUser = user;
  const uid = user.uid;

  const snap = await get(ref(db, `users/${uid}`));
  const data = snap.val() || {};

  // ✅ transaction password
  userTxPassword = data.txPassword || "";

  // ✅ SHOW WITHDRAW WALLET BALANCE (IMPORTANT)
  const walletEl = document.getElementById("wallet");
  if (walletEl) {
    walletEl.innerText = Number(data.wallets?.withdraw || 0);
  }

  await loadBankInfo();
  await checkBank();
});

/* ================= BANK INFO ================= */
async function loadBankInfo() {
  const snap = await get(ref(db, `users/${currentUser.uid}/bank`));
  const el = document.getElementById("bankInfo");

  if (!snap.exists()) {
    if (el) el.innerText = "No bank account";
    return;
  }

  const bank = snap.val();
  const shortAcc = bank.account
    ? "•••• " + bank.account.slice(-4)
    : "";

  if (el) el.innerText = `${bank.bank} ${shortAcc}`;
}

/* ================= BANK CHECK ================= */
async function checkBank() {
  const snap = await get(ref(db, `users/${currentUser.uid}/bank`));
  const popup = document.getElementById("bindPopup");
  const btn = document.querySelector(".withdraw-btn");

  if (!snap.exists()) {
    popup.style.display = "flex";
    if (btn) btn.disabled = true;
  } else {
    popup.style.display = "none";
    if (btn) btn.disabled = false;
  }
}

/* ================= POPUP ================= */
window.submitWithdraw = async function () {
  const amount = Number(document.getElementById("withdrawAmount").value);
  const pass = document.getElementById("txnPassword").value;

  const uid = currentUser.uid;

  /* ================= USER DATA ================= */
  const userSnap = await get(ref(db, `users/${uid}`));
  const userData = userSnap.val() || {};

  /* ================= INVITE CHECK ================= */
  const referrals = userData.referrals || {};
  const inviteCount = Number(referrals.count || 0);

  if (inviteCount < 1) {
    alert("You must invite at least 1 user to withdraw");
    return;
  }

  /* ================= 🔒 FULL INVEST CHECK (NEW) ================= */
  const totalDeposited = Number(userData.stats?.totalDeposited || 0);
  const totalInvested  = Number(userData.stats?.totalInvested || 0);

  if (totalInvested < totalDeposited) {
    alert("❌ You must invest 100% of your deposit before withdrawing");
    return;
  }
  /* ============================================================= */

  if (!amount || amount < 106) {
    alert("Minimum withdrawal amount is 106");
    return;
  }

  if (pass !== userTxPassword) {
    alert("Incorrect transaction password");
    return;
  }

  // 🔢 Fee calculation
  const fee = Math.round(amount * 0.05);
  const bankAmount = amount - fee;

  const walletRef = ref(db, `users/${uid}/wallets/withdraw`);

  // 🔒 Balance check
  const tx = await runTransaction(walletRef, (bal) => {
    const cur = Number(bal) || 0;
    if (cur < amount) return bal;
    return cur - amount;
  });

  if (!tx.committed) {
    alert("Insufficient withdraw balance");
    return;
  }

  // ✅ Save withdraw request
  await push(ref(db, "withdrawals"), {
    uid,
    requestAmount: amount,
    fee,
    bankAmount,
    status: "pending",
    createdAt: Date.now()
  });

  document.getElementById("wallet").innerText = tx.snapshot.val();

  alert(`Withdraw submitted ✅\nBank Amount: ₹${bankAmount}`);

  document.getElementById("withdrawAmount").value = "";
  document.getElementById("txnPassword").value = "";
};
