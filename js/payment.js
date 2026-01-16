import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { ref, push, get }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
/* ================= GET AMOUNT ================= */
const params = new URLSearchParams(window.location.search);
const rechargeAmount = Number(params.get("amount")) || 0;

// 🔴 CHANGE HERE: elements EXIST karte hain ya nahi check
const payAmountEl = document.getElementById("payAmount");
const transferAmountEl = document.getElementById("transferAmount");
const amtTextEl = document.getElementById("amtText");
const qrAmountEl = document.getElementById("qrAmount");

if (payAmountEl) payAmountEl.innerText = rechargeAmount;
if (transferAmountEl) transferAmountEl.innerText = rechargeAmount;
if (amtTextEl) amtTextEl.innerText = rechargeAmount;
if (qrAmountEl) qrAmountEl.innerText = rechargeAmount;

/* ================= TIMER ================= */
let time = 600;
const timerEl = document.getElementById("timer");

if (timerEl) {
  setInterval(() => {
    time--;
    const m = String(Math.floor(time / 60)).padStart(2, "0");
    const s = String(time % 60).padStart(2, "0");
    timerEl.innerText = `00:${m}:${s}`;
  }, 1000);
}

/* ================= AUTH ================= */
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/index.html";
  }
  currentUser = user;
});

/* ================= TAB SWITCH ================= */
window.showDirect = function () {
  document.getElementById("directBox").style.display = "block";
  document.getElementById("qrBox").style.display = "none";

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab")[0].classList.add("active");
};

window.showQR = function () {
  document.getElementById("directBox").style.display = "none";
  document.getElementById("qrBox").style.display = "block";

  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab")[1].classList.add("active");
};

/* ================= COPY ================= */
window.copyText = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText);
  alert("Copied");
};

/* ================= SUBMIT UTR ================= */
window.submitUTR = async function () {
  const utr = document.getElementById("utr").value.trim();

  if (!/^\d{12}$/.test(utr)) {
    alert("Enter Valid UTR Number");
    return;
  }

  const paymentsRef = ref(db, "payments");
  const snap = await get(paymentsRef);

  let duplicate = false;
  snap.forEach(c => {
    if (c.val().utr === utr) duplicate = true;
  });

  if (duplicate) {
    alert("UTR already used");
    return;
  }

  const newPaymentRef = await push(paymentsRef, {
    uid: currentUser.uid,
    amount: rechargeAmount,
    utr,
    status: "pending",
    createdAt: Date.now()
  });

  // 🔥 paymentId localStorage me save
  localStorage.setItem("lastPaymentId", newPaymentRef.key);

  alert("UTR submitted, waiting for approval...");
  document.getElementById("utr").value = "";

};

/* ================= PAYMENT APP REDIRECT ================= */

// 🔴 CHANGE HERE: Paytm open
window.openPaytm = function () {
  // UPI deeplink (Paytm)
  window.location.href =
    "upi://pay?pa=inzamamulh758@ptaxis&pn=Recharge&am=" + rechargeAmount;
};

// 🔴 CHANGE HERE: PhonePe open
window.openPhonePe = function () {
  // UPI deeplink (PhonePe)
  window.location.href =
    "upi://pay?pa=inzamamulh758@ptaxis&pn=Recharge&am=" + rechargeAmount;
};
import { onValue }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* ================= AUTO STATUS CHECK ================= */

const paymentId = localStorage.getItem("lastPaymentId");

if (paymentId) {
  const paymentStatusRef = ref(db, "payments/" + paymentId);

  onValue(paymentStatusRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.val();

    if (data.status === "approved") {
      localStorage.removeItem("lastPaymentId");
      window.location.href = "/success.html";
    }

    if (data.status === "rejected") {
      localStorage.removeItem("lastPaymentId");
      window.location.href = "/failed.html";
    }
  });
}


