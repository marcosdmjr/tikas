document.addEventListener('DOMContentLoaded', () => {
  const payButton = document.getElementById('pay-button');
  payButton.addEventListener('click', handlePayment);
});

function handlePayment() {
  const payButton = document.getElementById('pay-button');
  payButton.disabled = true;
  payButton.innerHTML = '<span class="button-text">PROCESSANDO...</span>';

  setTimeout(() => {
    window.location.href = 'pagamento-tarifa.html';
  }, 500);
}
