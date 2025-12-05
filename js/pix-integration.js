const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function createPix(customerData) {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/create-pix`;

    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      customerName: customerData.nome,
      customerEmail: customerData.email || 'cliente@email.com',
      customerPhone: customerData.telefone || '11999999999',
      customerDocument: customerData.cpf || customerData.chavePix,
      pixKey: customerData.chavePix,
      pixKeyType: customerData.tipoChave,
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

    return data;
  } catch (error) {
    console.error('Erro ao criar PIX:', error);
    throw error;
  }
}

function showPixQRCode(qrcode, amount) {
  const modalHTML = `
    <div id="pix-qrcode-modal" class="screen is-modal is-active" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 16px; padding: 32px; max-width: 400px; text-align: center;">
        <h2 style="margin: 0 0 16px; font-size: 24px; color: #000;">Pagar Taxa de Confirmação</h2>
        <p style="margin: 0 0 24px; color: #666;">Valor: R$ ${amount.toFixed(2)}</p>
        <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <canvas id="pix-qrcode-canvas"></canvas>
        </div>
        <button id="copy-pix-code" style="width: 100%; padding: 16px; background: #00B37E; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-bottom: 12px;">
          Copiar código PIX
        </button>
        <button id="close-pix-modal" style="width: 100%; padding: 16px; background: #E5E5E5; color: #666; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          Fechar
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const canvas = document.getElementById('pix-qrcode-canvas');
  if (canvas && window.QRCode) {
    new QRCode(canvas, {
      text: qrcode,
      width: 256,
      height: 256,
    });
  }

  document.getElementById('copy-pix-code').addEventListener('click', () => {
    navigator.clipboard.writeText(qrcode);
    alert('Código PIX copiado!');
  });

  document.getElementById('close-pix-modal').addEventListener('click', () => {
    const modal = document.getElementById('pix-qrcode-modal');
    if (modal) modal.remove();
  });
}

async function handlePixFormSubmit(formData) {
  try {
    showLoadingOverlay('Gerando PIX...');

    const pixData = await createPix(formData);

    hideLoadingOverlay();

    if (pixData.qrcode) {
      showPixQRCode(pixData.qrcode, pixData.amount);

      checkPaymentStatus(pixData.transactionId);
    }
  } catch (error) {
    hideLoadingOverlay();
    alert('Erro ao gerar PIX. Tente novamente.');
    console.error(error);
  }
}

async function checkPaymentStatus(transactionId) {
  const maxAttempts = 60;
  let attempts = 0;

  const interval = setInterval(async () => {
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
        clearInterval(interval);

        const modal = document.getElementById('pix-qrcode-modal');
        if (modal) modal.remove();

        if (typeof window.showScreen === 'function') {
          window.showScreen('nine');
        } else {
          location.hash = '#nine';
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
    }
  }, 5000);
}

function showLoadingOverlay(message) {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;';
  overlay.textContent = message;
  document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

window.handlePixFormSubmit = handlePixFormSubmit;
