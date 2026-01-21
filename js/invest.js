import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// Import toast notifications
import "./toast.js";

/* ================= CONFIG ================= */
// pageCategory must be set in HTML before this script
// window.pageCategory = "bronze" | "silver" | "gold"

const list = document.getElementById("productList");
let currentUser = null;

/* ================= AUTH ================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }
  currentUser = user;
  await loadProducts();
});

/* ================= LOAD PRODUCTS ================= */
async function loadProducts() {
  if (!list) return;

  const snap = await get(ref(db, "products"));
  list.innerHTML = "";

  if (!snap.exists()) {
    list.innerHTML = "<p style='text-align:center;color:#999'>No products</p>";
    return;
  }

  snap.forEach((child) => {
    const p = child.val();
    const pid = child.key;

    // show only active + matching category
    if (!p.active) return;
    if (window.pageCategory && p.category !== window.pageCategory) return;

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <span class="vip-badge">${p.name.split(" ")[0]}</span>
      <img src="/images/${p.image || "image1.jpeg"}">
      
      <div class="card-content">
        <h3>${p.name}</h3>

        <div class="detail-row">
          <span class="detail-label">Price</span>
          <span class="detail-value">₹ ${p.price}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Revenue Duration</span>
          <span class="detail-value">${p.days} Days</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Daily Earnings</span>
          <span class="detail-value">₹ ${p.dailyIncome}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Revenue</span>
          <span class="detail-value">₹ ${(p.dailyIncome * p.days).toFixed(1)}</span>
        </div>

        <button class="invest-btn"
          id="invest-btn-${pid}"
          onclick='buyProduct({
            id:"${pid}",
            name:"${p.name}",
            price:${p.price},
            dailyIncome:${p.dailyIncome},
            days:${p.days}
          })'>
          Invest Now
        </button>
      </div>
    `;

    list.appendChild(card);

    // sync invested state
    syncButton(pid);
  });
}

/* ================= SYNC BUTTON ================= */
async function syncButton(pid) {
  if (!currentUser) return;

  const snap = await get(ref(db, `userProducts/${currentUser.uid}/${pid}`));
  if (snap.exists()) markInvested(pid);
}

function markInvested(pid) {
  const btn = document.getElementById(`invest-btn-${pid}`);
  if (!btn) return;

  btn.innerText = "✔ INVESTED";
  btn.disabled = true;
  btn.classList.add("invested");
}

/* ================= BUY PRODUCT ================= */
window.buyProduct = async function (product) {
  const { id, name, price, dailyIncome, days } = product;
  const uid = currentUser.uid;

  const prodRef = ref(db, `userProducts/${uid}/${id}`);
  if ((await get(prodRef)).exists()) {
    toastWarning("You have already invested in this product!");
    return;
  }

  // Get current wallet balances
  const walletsRef = ref(db, `users/${uid}/wallets`);
  const walletSnap = await get(walletsRef);
  const wallets = walletSnap.val() || {};

  const deposit = Number(wallets.deposit || 0);
  const withdraw = Number(wallets.withdraw || 0);
  const totalBalance = deposit + withdraw;



  // Check if combined balance is sufficient
  if (totalBalance < price) {
    toastError("Insufficient balance! Available: ₹" + totalBalance.toLocaleString());
    return;
  }

  // Calculate deductions: deposit first, remaining from withdraw
  let newDeposit = deposit;
  let newWithdraw = withdraw;
  let remaining = price;

  // First deduct from deposit
  if (deposit >= remaining) {
    newDeposit = deposit - remaining;
    remaining = 0;
  } else {
    // Use all deposit, then take rest from withdraw
    newDeposit = 0;
    remaining = remaining - deposit;
    newWithdraw = withdraw - remaining;
  }



  // Update wallets
  await set(walletsRef, {
    deposit: newDeposit,
    withdraw: newWithdraw
  });

  // ✅ Update stats.totalInvested for withdraw unlock logic
  const statsRef = ref(db, `users/${uid}/stats`);
  const statsSnap = await get(statsRef);
  const stats = statsSnap.val() || {};
  const currentInvested = Number(stats.totalInvested || 0);

  await set(statsRef, {
    ...stats,
    totalInvested: currentInvested + price
  });



  // Save product purchase
  await set(prodRef, {
    productId: id,
    name,
    price,
    dailyIncome,
    days,
    startAt: Date.now(),
    lastIncomeDay: 0,
    status: "active"
  });

  toastSuccess("Product purchased successfully! 🎉");
  markInvested(id);
};
