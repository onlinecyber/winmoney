/* ================= AMOUNT SELECT ================= */
window.selectAmount = function (element, value) {

  // 🔥 remove active from all
  document.querySelectorAll(".amount").forEach(el => {
    el.classList.remove("active");
  });

  // 🔥 add active to clicked
  element.classList.add("active");

  // 🔥 set input value
  const input = document.getElementById("amount");
  if (input) {
    input.value = value;
  }

  // 🔥 store globally
  window.selectedAmount = value;

  console.log("Selected Amount:", value);
};


/* ================= CHANNEL SELECT ================= */
window.selectChannel = function (el) {
  document.querySelectorAll(".channel").forEach(c => {
    c.classList.remove("active");
  });
  el.classList.add("active");
};


/* ================= GO TO PAYMENT ================= */
window.goToPayment = function () {
  const amt = Number(document.getElementById("amount")?.value);

  if (!amt || amt <= 0) {
    alert("Please select valid amount");
    return;
  }

  window.location.href = `/payment.html?amount=${amt}`;
};
