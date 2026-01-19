import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { ref, get } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

import "./toast.js";

/* ================= LOAD BALANCE ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  const snap = await get(ref(db, `users/${user.uid}`));
  const data = snap.val() || {};

  const depositBal = Number(data.wallets?.deposit || 0);
  const balanceEl = document.getElementById("currentBalance");

  if (balanceEl) {
    balanceEl.innerText = `₹${depositBal.toLocaleString()}`;
  }
});

/* ================= AMOUNT SELECT ================= */
window.selectAmount = function (element, value) {

  // 🔥 remove active from all
  document.querySelectorAll(".amount").forEach(el => {
    el.classList.remove("active");
  });

  // 🔥 add active to clicked
  element.classList.add("active");

  // 🔥 set input value
  const input = document.getElementById("amount");
  if (input) {
    input.value = value;
  }

  // 🔥 store globally
  window.selectedAmount = value;

  console.log("Selected Amount:", value);
};


/* ================= CHANNEL SELECT ================= */
window.selectChannel = function (el) {
  document.querySelectorAll(".channel").forEach(c => {
    c.classList.remove("active");
  });
  el.classList.add("active");
};


/* ================= GO TO PAYMENT ================= */
window.goToPayment = function () {
  const amt = Number(document.getElementById("amount")?.value);

  if (!amt || amt <= 0) {
    toastWarning("Please select a valid amount");
    return;
  }

  window.location.href = `/payment.html?amount=${amt}`;
};
