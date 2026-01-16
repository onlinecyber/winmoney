import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref, get, update, runTransaction, push
} from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const snap = await get(ref(db, `userProducts/${uid}`));
  if (!snap.exists()) return;

  const now = Date.now();

  for (const [pid, p] of Object.entries(snap.val())) {

    if (p.status !== "active") continue;

    const daysPassed = Math.floor((now - p.startAt) / ONE_DAY);
    const eligibleDays = Math.min(daysPassed, p.days);
    const lastPaid = p.lastIncomeDay || 0;

    if (eligibleDays <= lastPaid) continue;

    // 📝 Add entries to income history (for tracking/display)
    for (let d = lastPaid + 1; d <= eligibleDays; d++) {
      const amount = Number(p.dailyIncome);

      // ✅ ONLY ADD TO HISTORY (not to wallet yet)
      await push(ref(db, `incomeHistory/${uid}`), {
        productId: pid,
        productName: p.name,
        day: d,
        amount,
        status: "pending", // pending = not yet added to wallet
        createdAt: Date.now()
      });
    }

    // Check if product duration is complete
    const isComplete = eligibleDays >= p.days;

    if (isComplete) {
      // 💰 PRODUCT COMPLETE - Add total amount to withdraw wallet
      const totalIncome = Number(p.dailyIncome) * p.days;

      await runTransaction(
        ref(db, `users/${uid}/wallets/withdraw`),
        bal => (Number(bal) || 0) + totalIncome
      );

      // Update all pending income history entries to "paid"
      const historySnap = await get(ref(db, `incomeHistory/${uid}`));
      if (historySnap.exists()) {
        for (const [hid, h] of Object.entries(historySnap.val())) {
          if (h.productId === pid && h.status === "pending") {
            await update(ref(db, `incomeHistory/${uid}/${hid}`), {
              status: "paid"
            });
          }
        }
      }

      console.log(`✅ Product ${p.name} completed! Total ₹${totalIncome} added to wallet`);
    }

    // Update product status
    await update(ref(db, `userProducts/${uid}/${pid}`), {
      lastIncomeDay: eligibleDays,
      status: isComplete ? "completed" : "active"
    });
  }
});
