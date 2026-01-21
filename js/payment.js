import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { ref, push, get, onValue }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

import "./toast.js";

/* ================= GET AMOUNT ================= */
const params = new URLSearchParams(window.location.search);
const rechargeAmount = Number(params.get("amount")) || 0;

// 🔴 CHANGE HERE: elements EXIST karte hain ya nahi check
const payAmountEl = document.getElementById("payAmount");
const transferAmountEl = document.getElementById("TransferAmount");
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
    if (time < 0) time = 0;
    const m = String(Math.floor(time / 60)).padStart(2, "0");
    const s = String(time % 60).padStart(2, "0");
    timerEl.innerText = `00:${m}:${s}`;
  }, 1000);
}

/* ================= LOAD PAYMENT SETTINGS ================= */
let dynamicUpiId = ""; // Will be loaded from Firebase

try {
  onValue(ref(db, "settings/payment"), snap => {
    if (snap.exists()) {
      const data = snap.val();

      // Store UPI for deeplinks
      if (data.upiId) {
        dynamicUpiId = data.upiId;
      }

      // Update UPI ID display
      const upiEl = document.getElementById("upi");
      if (upiEl && data.upiId) upiEl.innerText = data.upiId;

      // Update QR Code image
      const qrImgs = document.querySelectorAll("#qrBox img");
      if (qrImgs.length > 0 && data.qrCodeUrl) {
        qrImgs.forEach(img => img.src = data.qrCodeUrl);
      }
    }
  });
} catch (e) {
  console.log("Settings load error:", e);
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
  toastSuccess("Copied!");
};

/* ================= UTR ERROR DISPLAY ================= */
function showUtrError(message) {
  const errorEl = document.getElementById("utrError");
  const errorEl2 = document.getElementById("utrError2");
  if (errorEl) {
    errorEl.innerText = message;
    errorEl.style.display = "block";
  }
  if (errorEl2) {
    errorEl2.innerText = message;
    errorEl2.style.display = "block";
  }
}

window.clearUtrError = function () {
  const errorEl = document.getElementById("utrError");
  const errorEl2 = document.getElementById("utrError2");
  if (errorEl) errorEl.style.display = "none";
  if (errorEl2) errorEl2.style.display = "none";
};

/* ================= SUBMIT UTR ================= */
window.submitUTR = async function () {
  // Get UTR from whichever input has value
  let utr = document.getElementById("utr")?.value.trim().replace(/\s/g, '') || "";
  if (!utr) {
    utr = document.getElementById("utr2")?.value.trim().replace(/\s/g, '') || "";
  }

  // UTR validation: 12-22 digits (standard UPI UTR range)
  if (!utr) {
    showUtrError("Please enter UTR number");
    return;
  }

  if (!/^\d+$/.test(utr)) {
    showUtrError("UTR should contain only numbers");
    return;
  }

  if (utr.length < 12) {
    showUtrError("Invalid UTR. Minimum 12 digits required");
    return;
  }

  if (utr.length > 22) {
    showUtrError("Invalid UTR. Maximum 22 digits allowed");
    return;
  }

  const paymentsRef = ref(db, "payments");
  const snap = await get(paymentsRef);

  let duplicate = false;
  snap.forEach(c => {
    if (c.val().utr === utr) duplicate = true;
  });

  if (duplicate) {
    showUtrError("This UTR has already been used");
    return;
  }

  const newPaymentRef = await push(paymentsRef, {
    uid: currentUser.uid,
    amount: rechargeAmount,
    utr,
    status: "pending",
    createdAt: Date.now()
  });

  // 🔥 Save to localStorage for pending page
  localStorage.setItem("lastPaymentId", newPaymentRef.key);
  localStorage.setItem("lastPaymentAmount", rechargeAmount);

  // 🔥 Redirect to pending/buffering page
  location.href = `/pending.html?id=${newPaymentRef.key}&amount=${rechargeAmount}`;

};

/* ================= PAYMENT APP REDIRECT ================= */

// Paytm open with dynamic UPI
window.openPaytm = function () {
  if (!dynamicUpiId) {
    toastError("Payment settings not loaded. Please refresh.");
    return;
  }
  window.location.href = `upi://pay?pa=${dynamicUpiId}&pn=Recharge&am=${rechargeAmount}`;
};

// PhonePe open with dynamic UPI
window.openPhonePe = function () {
  if (!dynamicUpiId) {
    toastError("Payment settings not loaded. Please refresh.");
    return;
  }
  window.location.href = `upi://pay?pa=${dynamicUpiId}&pn=Recharge&am=${rechargeAmount}`;
};

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
