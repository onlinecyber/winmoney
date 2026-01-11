import { auth, db } from "./firebase.js";
import { ref, set } from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let currentUser = null;

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
