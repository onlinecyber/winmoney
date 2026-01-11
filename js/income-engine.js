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

    const daysPassed =
      Math.floor((now - p.startAt) / ONE_DAY);

    const eligibleDays =
      Math.min(daysPassed, p.days);

    const lastPaid = p.lastIncomeDay || 0;

    if (eligibleDays <= lastPaid) continue;

    for (let d = lastPaid + 1; d <= eligibleDays; d++) {

      const amount = Number(p.dailyIncome);

      // ✅ ADD TO WITHDRAW WALLET ONLY
      await runTransaction(
        ref(db, `users/${uid}/wallets/withdraw`),
        bal => (Number(bal) || 0) + amount
      );

      // ✅ HISTORY
      await push(ref(db, `incomeHistory/${uid}`), {
        productId: pid,
        productName: p.name,
        day: d,
        amount,
        createdAt: Date.now()
      });
    }

    await update(ref(db, `userProducts/${uid}/${pid}`), {
      lastIncomeDay: eligibleDays,
      status: eligibleDays >= p.days ? "completed" : "active"
    });
  }
});
