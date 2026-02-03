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

        // 1. Set name (HTML has no subtext element anymore)
        document.getElementById('userName').textContent = name;

        // 2. Set phone in details section ONLY
        const phoneEl = document.getElementById('userPhone');
        if (phoneEl) phoneEl.textContent = phone;

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
    // 1. Total Earnings from incomeHistory
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

    // 2. Active Products count
    onValue(ref(db, `userProducts/${uid}`), (snap) => {
        const productsEl = document.getElementById('totalProducts');
        if (!productsEl) return;

        let activeCount = 0;
        if (snap.exists()) {
            snap.forEach(child => {
                const product = child.val();
                if (product.status === "active") activeCount++;
            });
        }
        productsEl.textContent = activeCount;
    });

    // 3. User Node Stats (Check-in, Referrals)
    onValue(ref(db, `users/${uid}`), (snap) => {
        if (!snap.exists()) return;
        const data = snap.val();

        // Check-in Streak
        const streakEl = document.getElementById('checkinStreak');
        if (streakEl) streakEl.textContent = data.checkin?.streak || 0;

        // 🎯 Referral Count (Ultimate Robust Logic)
        const referralEl = document.getElementById('referralCount');
        if (referralEl) {
            let count = 0;
            if (data.referrals) {
                if (typeof data.referrals === 'object') {
                    // Try getting direct count first
                    count = Number(data.referrals.count);

                    // If no direct count, count the keys (excluding meta keys)
                    if (isNaN(count) || count === 0) {
                        count = Object.keys(data.referrals).filter(k => k !== 'count' && k !== 'reward').length;
                    }
                } else if (typeof data.referrals === 'number') {
                    count = data.referrals;
                }
            }

            // Fallback 2: Check separate referralCount field
            if (!count && data.referralCount) {
                count = Number(data.referralCount) || 0;
            }

            // Fallback 3: Check referral history length
            if (!count && data.referralHistory) {
                count = Object.keys(data.referralHistory).length;
            }

            referralEl.textContent = count || 0;
        }
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
