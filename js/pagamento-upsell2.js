const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let transactionId = null;
let checkPaymentInterval = null;

function getStoredFormData() {
  try {
    const stored = localStorage.getItem('userPixData');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler dados do localStorage', e);
  }
  return null;
}

function gerarCPF() {
  let cpf = '';
  for (let i = 0; i < 9; i++) {
    cpf += Math.floor(Math.random() * 10);
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let dv1 = resto > 9 ? 0 : resto;
  cpf += dv1;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let dv2 = resto > 9 ? 0 : resto;
  cpf += dv2;

  return cpf;
}

function gerarEmail(nome) {
  const provedores = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br'];
  const nomeFormatado = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
  const provedor = provedores[Math.floor(Math.random() * provedores.length)];
  const numero = Math.floor(Math.random() * 999);
  return `${nomeFormatado}${numero}@${provedor}`;
}

function gerarTelefone() {
  const ddd = ['11', '21', '31', '41', '51', '61', '71', '81', '91'];
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return `${ddd[Math.floor(Math.random() * ddd.length)]}9${num}`;
}

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  const errorElement = document.getElementById('error-message');
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  errorElement.style.display = 'block';
}

async function createPixPayment() {
  try {
    const formData = getStoredFormData();

    if (!formData) {
      throw new Error('Dados do formulário não encontrados');
    }

    let cpf = formData.chavePix;
    if (formData.tipoChave === 'CPF') {
      cpf = formData.chavePix.replace(/\D/g, '');
    } else {
      cpf = gerarCPF();
    }

    const payload = {
      customerName: formData.nome,
      customerEmail: gerarEmail(formData.nome),
      customerPhone: gerarTelefone(),
      customerDocument: cpf,
      pixKey: formData.chavePix,
      pixKeyType: formData.tipoChave,
      amount: 2190,
      itemTitle: 'Taxa Anti-Fraude',
      transactionType: 'upsell2',
    };

    const apiUrl = `${SUPABASE_URL}/functions/v1/create-pix`;
    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erro ao gerar PIX');
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar PIX:', error);
    throw error;
  }
}

function handlePixSuccess(data) {
  console.log('PIX gerado com sucesso:', data);

  transactionId = data.transactionId;

  document.getElementById('loading').style.display = 'none';
  document.getElementById('payment-content').style.display = 'block';

  document.getElementById('amount').textContent = `R$ ${data.amount.toFixed(2).replace('.', ',')}`;

  if (data.expirationDate) {
    const expirationDate = new Date(data.expirationDate);
    const formattedDate = expirationDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('expiration').textContent = formattedDate;
  } else {
    const expirationDate = new Date(Date.now() + 30 * 60000);
    const formattedDate = expirationDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('expiration').textContent = formattedDate;
  }

  document.getElementById('pix-code').value = data.qrcode;

  if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    const canvas = document.createElement('canvas');
    document.getElementById('qrcode').appendChild(canvas);

    QRCode.toCanvas(canvas, data.qrcode, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, function(error) {
      if (error) {
        console.error('Erro ao gerar QRCode:', error);
        showQRCodeImage(data.qrcode);
      }
    });
  } else {
    showQRCodeImage(data.qrcode);
  }

  document.getElementById('copy-btn').addEventListener('click', function() {
    const pixCode = document.getElementById('pix-code');
    pixCode.select();
    pixCode.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(pixCode.value).then(() => {
      const copyBtn = document.getElementById('copy-btn');
      copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copiado!</span>';
      copyBtn.classList.add('copied');

      setTimeout(function() {
        copyBtn.innerHTML = '<i class="far fa-copy"></i> <span>Copiar</span>';
        copyBtn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
    });
  });

  if (transactionId) {
    iniciarVerificacaoPagamento(transactionId);
  }
}

function showQRCodeImage(qrcode) {
  const qrcodeImg = document.getElementById('qrcode-img');
  qrcodeImg.src = `https://quickchart.io/qr?text=${encodeURIComponent(qrcode)}&size=200`;
  qrcodeImg.style.display = 'block';
  document.getElementById('qrcode').style.display = 'none';
}

async function verificarPagamento(idTransacao) {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/check-payment`;
    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transactionId: idTransacao })
    });

    const data = await response.json();

    if (data.status === 'paid' || data.status === 'approved') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return false;
  }
}

function iniciarVerificacaoPagamento(idTransacao) {
  checkPaymentInterval = setInterval(async () => {
    const isPaid = await verificarPagamento(idTransacao);

    if (isPaid) {
      clearInterval(checkPaymentInterval);
      window.location.href = '/confirmacao.html';
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    const pixData = await createPixPayment();
    handlePixSuccess(pixData);
  } catch (error) {
    showError('Erro ao gerar PIX. Por favor, tente novamente.');
    console.error(error);
  }
});
