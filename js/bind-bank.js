import { auth, db } from "./firebase.js";
import { ref, set, get } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let currentUser = null;

/* ================= SHA-256 HASH FUNCTION ================= */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// 🔐 check login
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "/index.html";
    return;
  }
  currentUser = user;
});

// 🔥 ADD BANK CARD
window.addBank = async function () {

  const bank = document.getElementById("bank").value;
  const ifsc = document.getElementById("ifsc").value.trim();
  const holder = document.getElementById("holder").value.trim();
  const account = document.getElementById("account").value.trim();
  const txpass = document.getElementById("txpass").value.trim();

  // 🔴 validation
  if (!bank || !ifsc || !holder || !account || !txpass) {
    alert("Please fill all details");
    return;
  }

  try {
    // 🔐 Verify transaction password
    const userSnap = await get(ref(db, "users/" + currentUser.uid));
    const userData = userSnap.val() || {};
    const storedTxPassword = userData.txPassword || "";

    const hashedInput = await hashPassword(txpass);
    if (hashedInput !== storedTxPassword) {
      alert("Incorrect transaction password");
      return;
    }

    // 🔴 SAVE BANK UNDER USER
    await set(ref(db, "users/" + currentUser.uid + "/bank"), {
      bankName: bank,
      ifsc: ifsc,
      holder: holder,
      account: account,
      createdAt: Date.now()
    });

    alert("Bank card added successfully");

    // 🔥 BACK TO WITHDRAW PAGE
    location.href = "/withdraw.html";

  } catch (err) {
    alert(err.message);
  }
};
