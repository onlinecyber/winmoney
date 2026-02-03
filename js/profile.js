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
    // Set avatar letter
    const name = user.displayName || user.email || "User";
    document.getElementById('avatarLetter').textContent = name.charAt(0).toUpperCase();

    // Set name and email
    document.getElementById('userName').textContent = name;
    document.getElementById('userEmail').textContent = user.email || "No email";

    // Set join date
    const creationTime = user.metadata.creationTime;
    if (creationTime) {
        const joinDate = new Date(creationTime);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    // Set phone
    if (user.phoneNumber) {
        document.getElementById('userPhone').textContent = user.phoneNumber;
    }

    // Load VIP level
    const userRef = ref(db, `users/${user.uid}`);
    const snap = await get(userRef);
    if (snap.exists()) {
        const data = snap.val();
        const vipLevel = data.vipLevel || 0;
        document.getElementById('vipBadge').textContent = `VIP ${vipLevel}`;
    }

    // Check bank status
    const bankRef = ref(db, `bankAccounts/${user.uid}`);
    const bankSnap = await get(bankRef);
    if (bankSnap.exists()) {
        document.getElementById('bankStatus').textContent = "✓ Linked";
        document.getElementById('bankStatus').style.color = "#4ade80";
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
        document.getElementById('totalEarnings').textContent = `₹${totalEarnings.toLocaleString()}`;
    });

    // Active Products count
    onValue(ref(db, `userProducts/${uid}`), (snap) => {
        if (snap.exists()) {
            let activeCount = 0;
            snap.forEach(child => {
                const product = child.val();
                if (product.active) activeCount++;
            });
            document.getElementById('totalProducts').textContent = activeCount;
        }
    });

    // Check-in streak
    onValue(ref(db, `users/${uid}/checkin`), (snap) => {
        if (snap.exists()) {
            const checkin = snap.val();
            document.getElementById('checkinStreak').textContent = checkin.streak || 0;
        }
    });

    // Referral count
    onValue(ref(db, `users/${uid}/referrals`), (snap) => {
        if (snap.exists()) {
            const referrals = snap.val();
            const count = referrals.count || Object.keys(referrals).length || 0;
            document.getElementById('referralCount').textContent = count;
        }
    });
}

/* ================= LOGOUT ================= */
window.logout = async () => {
    if (confirm("Are you sure you want to logout?")) {
        await signOut(auth);
        location.href = "/login.html";
    }
};
