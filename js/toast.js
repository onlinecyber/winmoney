/* ================= CUSTOM TOAST NOTIFICATIONS ================= */

// Toast container styles (injected once)
const toastStyles = `
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: 90%;
}

.toast {
  padding: 14px 20px;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideIn 0.3s ease, fadeOut 0.3s ease forwards;
  animation-delay: 0s, 2.7s;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  backdrop-filter: blur(10px);
}

.toast.success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(52, 211, 153, 0.95));
}

.toast.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(248, 113, 113, 0.95));
}

.toast.warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(251, 191, 36, 0.95));
}

.toast.info {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
}

.toast-icon {
  font-size: 18px;
}

.toast-message {
  flex: 1;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
}
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.textContent = toastStyles;
    document.head.appendChild(style);
    stylesInjected = true;
}

// Get or create container
function getContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// Show toast
window.showToast = function (message, type = 'info', duration = 3000) {
    injectStyles();
    const container = getContainer();

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

    container.appendChild(toast);

    // Remove after duration
    setTimeout(() => {
        toast.remove();
    }, duration);
};

// Shorthand functions
window.toastSuccess = (msg) => showToast(msg, 'success');
window.toastError = (msg) => showToast(msg, 'error');
window.toastWarning = (msg) => showToast(msg, 'warning');
window.toastInfo = (msg) => showToast(msg, 'info');
