import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
    ref,
    get,
    onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* ================= AUTH CHECK ================= */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "/login.html";
        return;
    }

    // Load user profile
    loadUserProfile(user);
    loadUserStats(user.uid);
});

/* ================= LOAD USER PROFILE ================= */
async function loadUserProfile(user) {
    const userRef = ref(db, `users/${user.uid}`);
    const snap = await get(userRef);

    if (snap.exists()) {
        const data = snap.val();
        const name = data.name || "User";
        const phone = data.phone || "Not set";

        // Set avatar letter
        document.getElementById('avatarLetter').textContent = name.charAt(0).toUpperCase();

        // Set name and phone/email
        document.getElementById('userName').textContent = name;
        document.getElementById('userEmail').textContent = phone; // Show phone instead of fake email

        // Set phone in details section
        document.getElementById('userPhone').textContent = phone;

        // Load VIP level
        const vipLevel = data.vipLevel || 0;
        document.getElementById('vipBadge').textContent = `VIP ${vipLevel}`;

        // Check bank account status
        const bankRef = ref(db, `bankAccounts/${user.uid}`);
        const bankSnap = await get(bankRef);
        if (bankSnap.exists()) {
            document.getElementById('bankStatus').textContent = "Linked ✅";
            document.getElementById('bankStatus').style.color = "#4ade80";
        }
    }

    // Set join date (from auth metadata)
    const creationTime = user.metadata.creationTime;
    if (creationTime) {
        const joinDate = new Date(creationTime);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
}

/* ================= LOAD USER STATS ================= */
function loadUserStats(uid) {
    // Total Earnings from incomeHistory
    onValue(ref(db, `incomeHistory/${uid}`), (snap) => {
        let totalEarnings = 0;
        if (snap.exists()) {
            snap.forEach(child => {
                const income = child.val();
                totalEarnings += Number(income.amount) || 0;
            });
        }
        const earningsEl = document.getElementById('totalEarnings');
        if (earningsEl) earningsEl.textContent = `₹${totalEarnings.toLocaleString()}`;
    });

    // Active Products count
    onValue(ref(db, `userProducts/${uid}`), (snap) => {
        const productsEl = document.getElementById('totalProducts');
        if (!productsEl) return;

        if (snap.exists()) {
            let activeCount = 0;
            snap.forEach(child => {
                const product = child.val();
                if (product.status === "active") activeCount++;
            });
            productsEl.textContent = activeCount;
        } else {
            productsEl.textContent = "0";
        }
    });

    // Check-in Streak
    onValue(ref(db, `users/${uid}/checkin`), (snap) => {
        const streakEl = document.getElementById('checkinStreak');
        if (!streakEl) return;
        const streak = snap.exists() ? (snap.val().streak || 0) : 0;
        streakEl.textContent = streak;
    });

    // Referral Count
    onValue(ref(db, `users/${uid}/referrals`), (snap) => {
        const referralEl = document.getElementById('referralCount');
        if (!referralEl) return;
        const count = snap.exists() ? (snap.val().count || 0) : 0;
        referralEl.textContent = count;
    });
}

/* ================= LOGOUT ================= */
window.logout = async () => {
    if (confirm("Are you sure you want to logout?")) {
        try {
            await signOut(auth);
            location.href = "/login.html";
        } catch (err) {
            console.error("Logout error:", err);
            alert("Logout failed. Try again.");
        }
    }
};
