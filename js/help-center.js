// FAQ accordion
document.querySelectorAll(".faq-item").forEach(item => {
  item.addEventListener("click", () => {
    const ans = item.querySelector(".faq-a");
    ans.style.display =
      ans.style.display === "block" ? "none" : "block";
  });
});

// Support buttons
window.openWhatsApp = function () {
  window.open("https://wa.me/919999999999", "_blank");
};

window.openTelegram = function () {
  window.open("https://t.me/your_telegram_username", "_blank");
};
