import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { ref, get, remove } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }

  currentUser = user;

  const bankSnap = await get(ref(db, "users/" + user.uid + "/bank"));

  if (!bankSnap.exists()) {
    alert("Bank details not added");
    location.href = "/account.html";
    return;
  }

  const bank = bankSnap.val();

  document.getElementById("bankName").innerText =
    bank.bank || "My Bank";

  document.getElementById("holder").innerText =
    bank.holder || "-";

  document.getElementById("ifsc").innerText =
    bank.ifsc || "-";

  const acc = bank.account || "";
  document.getElementById("account").innerText =
    acc ? "XXXX XXXX " + acc.slice(-4) : "-";
});

// 🔥 DELETE BANK
window.deleteBank = async function () {
  if (!confirm("Delete bank account permanently?")) return;

  await remove(ref(db, "users/" + currentUser.uid + "/bank"));

  alert("Bank account deleted");
  location.href = "/account.html";
};
