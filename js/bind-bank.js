import { auth, db } from "./firebase.js";
import { ref, set, get } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import "./toast.js";
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
  console.log("🔥 addBank() called");

  const bank = document.getElementById("bank").value;
  const ifsc = document.getElementById("ifsc").value.trim();
  const holder = document.getElementById("holder").value.trim();
  const account = document.getElementById("account").value.trim();
  const txpass = document.getElementById("txpass").value.trim();

  console.log("Bank:", bank, "IFSC:", ifsc, "Holder:", holder, "Account:", account);

  // 🔴 validation
  if (!bank || !ifsc || !holder || !account || !txpass) {
    toastWarning("Please fill all details");
    return;
  }

  try {
    console.log("🔐 Verifying transaction password...");

    // 🔐 Verify transaction password
    const userSnap = await get(ref(db, "users/" + currentUser.uid));
    const userData = userSnap.val() || {};
    const storedTxPassword = userData.txPassword || "";

    console.log("Stored password length:", storedTxPassword.length);

    // Check if stored password is hashed (64 chars) or plain text
    const hashedInput = await hashPassword(txpass);

    // Support both hashed and plain text passwords (for old users)
    const isMatch = (hashedInput === storedTxPassword) || (txpass === storedTxPassword);

    if (!isMatch) {
      toastError("Incorrect transaction password");
      console.log("❌ Password mismatch");
      return;
    }

    console.log("✅ Password verified, saving bank...");

    // 🔴 SAVE BANK UNDER USER
    await set(ref(db, "users/" + currentUser.uid + "/bank"), {
      bankName: bank,
      ifsc: ifsc,
      holder: holder,
      account: account,
      createdAt: Date.now()
    });

    console.log("✅ Bank saved successfully!");
    toastSuccess("Bank card added successfully!");

    // 🔥 BACK TO WITHDRAW PAGE
    location.href = "/withdraw.html";

  } catch (err) {
    console.error("❌ Error:", err);
    toastError("Error: " + err.message);
  }
};
