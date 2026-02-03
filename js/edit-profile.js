import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    updatePassword
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

let userUID = null;
let currentTxHash = "";

/* ================= AUTH CHECK ================= */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.href = "/login.html";
        return;
    }
    userUID = user.uid;
    loadCurrentData();
});

/* ================= LOAD DATA ================= */
async function loadCurrentData() {
    const snap = await get(ref(db, `users/${userUID}`));
    if (snap.exists()) {
        const data = snap.val();
        document.getElementById('editName').value = data.name || "";
        currentTxHash = data.txPassword || "";
    }
}

/* ================= HASH FUNCTION ================= */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ================= UPDATE NAME ================= */
window.updateName = async () => {
    const newName = document.getElementById('editName').value.trim();
    if (!newName) return toastWarning("Enter a valid name");

    try {
        await update(ref(db, `users/${userUID}`), { name: newName });
        toastSuccess("Name updated successfully!");
    } catch (e) {
        toastError("Failed to update name");
    }
};

/* ================= UPDATE LOGIN PASSWORD ================= */
window.updateLoginPassword = async () => {
    const newPass = document.getElementById('newLoginPassword').value;
    if (newPass.length < 6) return toastWarning("Password must be at least 6 characters");

    try {
        await updatePassword(auth.currentUser, newPass);
        toastSuccess("Login password updated!");
        document.getElementById('newLoginPassword').value = "";
    } catch (e) {
        if (e.code === "auth/requires-recent-login") {
            toastError("Security timeout. Please login again to change password.");
        } else {
            toastError("Failed to update password");
        }
    }
};

/* ================= UPDATE TX PASSWORD ================= */
window.updateTxPassword = async () => {
    const oldPass = document.getElementById('oldTxPassword').value;
    const newPass = document.getElementById('newTxPassword').value;

    if (!oldPass || !newPass) return toastWarning("Fill both password fields");
    if (newPass.length < 6) return toastWarning("New password must be at least 6 characters");

    const oldHash = await hashPassword(oldPass);
    if (oldHash !== currentTxHash) return toastError("Current TX password incorrect");

    try {
        const newHash = await hashPassword(newPass);
        await update(ref(db, `users/${userUID}`), { txPassword: newHash });
        currentTxHash = newHash;
        toastSuccess("TX Password updated!");
        document.getElementById('oldTxPassword').value = "";
        document.getElementById('newTxPassword').value = "";
    } catch (e) {
        toastError("Update failed");
    }
};
