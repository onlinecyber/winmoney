import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const activeList = document.getElementById("activeList");
const completedList = document.getElementById("completedList");

const ONE_DAY = 24 * 60 * 60 * 1000;

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  const prodRef = ref(db, "userProducts/" + user.uid);

  onValue(prodRef, (snapshot) => {
    activeList.innerHTML = "";
    completedList.innerHTML = "";

    if (!snapshot.exists()) {
      activeList.innerHTML =
        "<p style='text-align:center;color:#999'>No products yet</p>";
      return;
    }

    const now = Date.now();

    snapshot.forEach((child) => {
      const p = child.val();

      const daysPassed =
        Math.floor((now - p.startAt) / ONE_DAY);

      const eligibleDays =
        Math.min(daysPassed, p.days);

      const status =
        eligibleDays >= p.days ? "completed" : "active";

      const percent =
        Math.min((eligibleDays / p.days) * 100, 100);

      const div = document.createElement("div");
      div.className = "product" + (status === "completed" ? " completed" : "");

      div.innerHTML = `
        <h3>${p.name}</h3>

        <div class="row">Price: ₹${p.price}</div>
        <div class="row">Daily Income: ₹${p.dailyIncome}</div>
        <div class="row">Days: ${eligibleDays} / ${p.days}</div>

        <div class="progress">
          <div class="progress-fill"
            style="width:${percent}%"></div>
        </div>

        <div class="status ${status}">
          Status: ${status.toUpperCase()}
        </div>
      `;

      if (status === "completed") {
        completedList.appendChild(div);
      } else {
        activeList.appendChild(div);
      }
    });
  });
});
