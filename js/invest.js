import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref,
  get,
  set,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* ================= CONFIG ================= */
// pageCategory must be set in HTML before this script
// window.pageCategory = "welfare" | "welfare-fund" | "innovative"

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
      <span class="vip">${p.name.split(" ")[0]}</span>
      <img src="/images/${p.image || "image1.jpeg"}">
      <h3>${p.name}</h3>

      <div class="details">
        <p>Price <span>₹${p.price}</span></p>
        <p>Revenue Duration <span>${p.days} Days</span></p>
        <p>Daily Earnings <span>₹${p.dailyIncome}</span></p>
        <p>Total Revenue <span>₹${(p.dailyIncome * p.days).toFixed(2)}</span></p>
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
    alert("Already invested");
    return;
  }
  // new
   const walletSnap = await get(
    ref(db, `users/${currentUser.uid}/wallets/deposit`)
  );
  console.log("INVEST DEPOSIT =", walletSnap.val());

  const walletsRef = ref(db, `users/${uid}/wallets`);

  const tx = await runTransaction(walletsRef, (wallets) => {
    wallets = wallets || {};
    const deposit = Number(wallets.deposit || 0);

    if (deposit < price) return; // ❌ cancel

    return {
      deposit: deposit - price,
      withdraw: Number(wallets.withdraw || 0)
    };
  });

  if (!tx.committed) {
    alert("Insufficient deposit balance");
    return;
  }

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

  alert("Product purchased successfully 🎉");
};
