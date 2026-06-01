// billing.js — Subscription checkout via GCash or Credit Card

const params = new URLSearchParams(window.location.search);
const planId = params.get('plan');

const billingForm = document.getElementById('billingForm');
const billingContent = document.getElementById('billingContent');
const billingSuccess = document.getElementById('billingSuccess');
const planSummary = document.getElementById('planSummary');
const planTotal = document.getElementById('planTotal');
const confirmPayBtn = document.getElementById('confirmPayBtn');
const successMessage = document.getElementById('successMessage');

const gcashFields = document.getElementById('gcashFields');
const cardFields = document.getElementById('cardFields');

let selectedPlan = null;
let paymentMethod = 'gcash';

function formatPrice(amount) {
  return `₱${Number(amount).toLocaleString('en-PH')}`;
}

function loadPlan() {
  if (!planId || !DentalSync.SUBSCRIPTION_PLANS[planId]) {
    window.location.href = 'subscription.html';
    return null;
  }

  selectedPlan = DentalSync.SUBSCRIPTION_PLANS[planId];
  const features = selectedPlan.features.map(f => `<li>${f}</li>`).join('');

  planSummary.innerHTML = `
    <div class="billing-summary-row">
      <span style="color:var(--text-muted);">Plan</span>
      <strong>${selectedPlan.name}</strong>
    </div>
    <div class="billing-summary-row">
      <span style="color:var(--text-muted);">Billing cycle</span>
      <span>${selectedPlan.period}</span>
    </div>
    <ul style="color:var(--text-muted);font-size:0.9rem;margin:14px 0 0 18px;line-height:1.7;">${features}</ul>
  `;

  planTotal.textContent = `${formatPrice(selectedPlan.price)}/yr`;
  confirmPayBtn.textContent = `Confirm & Pay ${formatPrice(selectedPlan.price)}`;
  return selectedPlan;
}

function setPaymentMethod(method) {
  paymentMethod = method;
  document.querySelectorAll('.payment-method-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.method === method);
    const input = option.querySelector('input');
    if (input) input.checked = option.dataset.method === method;
  });
  gcashFields.classList.toggle('active', method === 'gcash');
  cardFields.classList.toggle('active', method === 'card');
}

document.querySelectorAll('.payment-method-option').forEach(option => {
  option.addEventListener('click', () => setPaymentMethod(option.dataset.method));
});

function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

function formatCardNumber(value) {
  const digits = digitsOnly(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

const cardNumberInput = document.getElementById('cardNumber');
const cardExpiryInput = document.getElementById('cardExpiry');

if (cardNumberInput) {
  cardNumberInput.addEventListener('input', () => {
    cardNumberInput.value = formatCardNumber(cardNumberInput.value);
  });
}

if (cardExpiryInput) {
  cardExpiryInput.addEventListener('input', () => {
    cardExpiryInput.value = formatExpiry(cardExpiryInput.value);
  });
}

function validateGcash() {
  const number = digitsOnly(document.getElementById('gcashNumber').value);
  const name = document.getElementById('gcashName').value.trim();

  if (!/^09\d{9}$/.test(number)) {
    showToast('Enter a valid GCash mobile number (09XXXXXXXXX).', 'error');
    return null;
  }
  if (!name) {
    showToast('Enter the GCash account name.', 'error');
    return null;
  }

  return {
    method: 'gcash',
    reference: `GCASH-${number.slice(-4)}-${Date.now().toString().slice(-6)}`,
    details: { number, name },
  };
}

function validateCard() {
  const name = document.getElementById('cardName').value.trim();
  const number = digitsOnly(document.getElementById('cardNumber').value);
  const expiry = document.getElementById('cardExpiry').value.trim();
  const cvv = document.getElementById('cardCvv').value.trim();

  if (!name) {
    showToast('Enter the name on your card.', 'error');
    return null;
  }
  if (number.length < 13 || number.length > 16) {
    showToast('Enter a valid card number.', 'error');
    return null;
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    showToast('Enter expiry as MM/YY.', 'error');
    return null;
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    showToast('Enter a valid CVV.', 'error');
    return null;
  }

  return {
    method: 'credit_card',
    reference: `CARD-${number.slice(-4)}-${Date.now().toString().slice(-6)}`,
    details: { name, last4: number.slice(-4), expiry },
  };
}

function showConfirmation(payment) {
  billingContent.classList.add('hidden');
  billingSuccess.classList.remove('hidden');

  const methodLabel = payment.method === 'gcash' ? 'GCash' : 'Credit Card';
  successMessage.textContent = `You are now subscribed to ${selectedPlan.name} (${formatPrice(selectedPlan.price)}/yr). Payment via ${methodLabel} was successful. Reference: ${payment.reference}.`;
}

if (billingForm) {
  billingForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!selectedPlan) return;

    const payment = paymentMethod === 'gcash' ? validateGcash() : validateCard();
    if (!payment) return;

    confirmPayBtn.disabled = true;
    confirmPayBtn.textContent = 'Processing payment…';

    setTimeout(() => {
      DentalSync.setSubscription(planId, payment);
      showToast('Payment successful. Subscription confirmed!', 'success');
      showConfirmation(payment);
      confirmPayBtn.disabled = false;
      confirmPayBtn.textContent = `Confirm & Pay ${formatPrice(selectedPlan.price)}`;
    }, 1200);
  });
}

loadPlan();
