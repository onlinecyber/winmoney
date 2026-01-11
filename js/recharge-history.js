import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* ================= LOAD RECHARGE HISTORY ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  const list = document.getElementById("historyList");
  list.innerHTML = "";

  const snap = await get(ref(db, "payments"));

  if (!snap.exists()) {
    list.innerHTML = "<p class='loading'>No recharge history</p>";
    return;
  }

  let found = false;

  snap.forEach(child => {
    const data = child.val();

    // 🔐 Only current user
    if (data.uid !== user.uid) return;

    found = true;

    const dateObj = new Date(data.createdAt || Date.now());
    const date = dateObj.toLocaleDateString();
    const time = dateObj.toLocaleTimeString();

    const status = (data.status || "pending").toLowerCase();

    const div = document.createElement("div");
    div.className = "history-item";

    div.innerHTML = `
      <div class="top">
        <div class="amount">₹${data.amount}</div>
        <div class="status ${status}">
          ${status.toUpperCase()}
        </div>
      </div>

      <div class="row">
        <span>Recharge Amount</span>
        <span>₹${data.amount}</span>
      </div>

      <div class="row">
        <span>Payment Mode</span>
        <span>${data.method || "Online"}</span>
      </div>

      <div class="row">
        <span>Recharge Time</span>
        <span>${date} ${time}</span>
      </div>
    `;

    list.prepend(div);
  });

  if (!found) {
    list.innerHTML = "<p class='loading'>No recharge history</p>";
  }
});
