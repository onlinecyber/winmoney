import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref, onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const list = document.getElementById("withdrawList");

/* ================= USER CHECK ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  const withdrawRef = ref(db, "withdrawals");

  onValue(withdrawRef, (snapshot) => {
    list.innerHTML = "";

    if (!snapshot.exists()) {
      list.innerHTML = "<p class='loading'>No withdraw history</p>";
      return;
    }

    snapshot.forEach(child => {
      const data = child.val();

      // 🔐 only current user
      if (data.uid !== user.uid) return;

      const dateObj = new Date(data.createdAt || Date.now());
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString();

      const status = (data.status || "pending").toLowerCase();

      const div = document.createElement("div");
      div.className = "history-item";

      div.innerHTML = `
        <div class="top">
          <div class="amount">₹${data.requestAmount}</div>
          <div class="status ${status}">
            ${status.toUpperCase()}
          </div>
        </div>

        <div class="row">
          <span>Amount Received</span>
          <span>₹${data.bankAmount}</span>
        </div>

        <div class="row">
          <span>Fee</span>
          <span>₹${data.fee}</span>
        </div>

        <div class="row">
          <span>Request Time</span>
          <span>${date} ${time}</span>
        </div>
      `;

      list.prepend(div);
    });
  });
});
