import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const list = document.getElementById("incomeList");
const filterBtns = document.querySelectorAll(".filters button");

let allItems = [];
let currentFilter = "all";

/* ================= AUTH ================= */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  const incomeRef = ref(db, "incomeHistory/" + user.uid);

  onValue(incomeRef, (snapshot) => {
    list.innerHTML = "";
    allItems = [];

    if (!snapshot.exists()) {
      list.innerHTML =
        "<div class='empty'>No income yet</div>";
      return;
    }

    snapshot.forEach((child) => {
      allItems.push(child.val());
    });

    // latest first
    allItems.sort((a, b) => b.createdAt - a.createdAt);

    renderList();
  });
});

/* ================= FILTER HANDLER ================= */
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentFilter = btn.dataset.filter;
    renderList();
  });
});

/* ================= RENDER LIST ================= */
function renderList() {
  list.innerHTML = "";

  const now = new Date();
  const todayStart = new Date(now.setHours(0,0,0,0)).getTime();
  const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);

  const filtered = allItems.filter(item => {
    if (!item.createdAt) return false;

    if (currentFilter === "today") {
      return item.createdAt >= todayStart;
    }

    if (currentFilter === "yesterday") {
      return item.createdAt >= yesterdayStart &&
             item.createdAt < todayStart;
    }

    return true; // all
  });

  if (filtered.length === 0) {
    list.innerHTML =
      "<div class='empty'>No records found</div>";
    return;
  }

  filtered.forEach(data => {
    const date = new Date(data.createdAt);

    const card = document.createElement("div");
    card.className = "income-card";

    card.innerHTML = `
      <div class="income-product">
        ${data.productName || "Product"}
      </div>

      <div class="income-day">
        Day ${data.day} Income
      </div>

      <div class="income-amount">
        + ₹${Number(data.amount).toFixed(2)}
      </div>

      <div class="income-time">
        ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
      </div>
    `;

    list.appendChild(card);
  });
}
