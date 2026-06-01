// auth.js — Authentication page functionality

// ── Toast utility ──────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.borderColor = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ── Toggle password visibility ──────────────────────────────
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  if (event && event.target) {
    event.target.textContent = isPassword ? '🙈' : '👁️';
  }
}

// ── Validate email ──────────────────────────────────────────
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ── Validate password strength ──────────────────────────────
function getPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return strength;
}

function updatePasswordStrength(inputId) {
  const input = document.getElementById(inputId);
  const strengthFill = document.querySelector('.strength-fill');
  const strengthText = document.querySelector('.strength-text strong');
  if (!input || !strengthFill || !strengthText) return;

  const strength = getPasswordStrength(input.value);
  const percentage = (strength / 6) * 100;
  strengthFill.style.width = percentage + '%';

  let text = 'Weak';
  let color = 'var(--danger)';
  if (strength >= 4) {
    text = 'Strong';
    color = 'var(--success)';
  } else if (strength >= 2) {
    text = 'Fair';
    color = 'var(--warning)';
  }

  strengthText.textContent = text;
  strengthFill.style.backgroundColor = color;
}

const demoUsers = [
  { email: 'patient@demo.com', password: 'patient123', role: 'patient', subscribed: 'Free', name: 'Demo Patient' },
  { email: 'dentist@demo.com', password: 'dentist123', role: 'dentist', subscribed: 'Free', name: 'Demo Dentist' },
  { email: 'exampatient@gmail.com', password: 'Simplepass123', role: 'patient', subscribed: 'Free', name: 'Example Patient' },
  { email: 'examdentist@gmail.com', password: 'Simplepass123', role: 'dentist', subscribed: 'Free', name: 'Example Dentist' },
];

function loadStoredUsers() {
  const raw = localStorage.getItem('dentalSyncUsers');
  if (!raw) return [];
  try {
    return JSON.parse(raw) || [];
  } catch (error) {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem('dentalSyncUsers', JSON.stringify(users));
}

function getAllUsers() {
  return [...loadStoredUsers(), ...demoUsers];
}

function findUserByEmailAndPassword(email, password) {
  return getAllUsers().find(user => user.email.toLowerCase() === email.toLowerCase() && user.password === password);
}

function findUserByEmail(email) {
  return getAllUsers().find(user => user.email.toLowerCase() === email.toLowerCase());
}

function createUser(user) {
  const users = loadStoredUsers();
  users.push(user);
  saveStoredUsers(users);
}

function currentPortalRole() {
  return window.location.pathname.includes('/DentistFile/') ? 'dentist' : 'patient';
}

function getPortalRedirect(role) {
  if (role === 'dentist') {
    return window.location.pathname.includes('/DentistFile/') ? 'index.html' : '../DentistFile/index.html';
  }
  return window.location.pathname.includes('/PatientFile/') ? 'index.html' : '../PatientFile/index.html';
}

// ── LOGIN FORM ──────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    const user = findUserByEmailAndPassword(email, password);
    if (!user) {
      showToast('Invalid email or password.', 'error');
      return;
    }

    showToast('Signing in...', 'info');
    setTimeout(() => {
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('subscribed', user.subscribed || 'Free');
      if (user.role === 'dentist') {
        localStorage.setItem('dentistName', 'Dr. Sherlyn Lacsamana');
        localStorage.setItem('dentistClinicId', 'lacsamana');
      }
      localStorage.setItem('rememberMe', document.getElementById('rememberMe').checked);

      const nextPage = getPortalRedirect(user.role);
      const message = 'Login successful! Redirecting...';

      showToast(message, 'success');
      setTimeout(() => {
        window.location.href = nextPage;
      }, 1200);
    }, 1500);
  });
}

// ── SIGNUP FORM ───────────────────────────────────────────
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    if (!firstName || !lastName) {
      showToast('Please enter your full name', 'error');
      return;
    }

    if (!validateEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!agreeTerms) {
      showToast('Please agree to the Terms of Service', 'error');
      return;
    }

    const emailExists = findUserByEmail(email);
    if (emailExists) {
      showToast('An account with this email already exists.', 'error');
      return;
    }

    showToast('Creating your account...', 'info');
    setTimeout(() => {
      const role = currentPortalRole();
      const user = {
        email,
        password,
        role,
        subscribed: 'Free',
        name: `${firstName} ${lastName}`,
      };

      createUser(user);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('subscribed', user.subscribed);

      showToast('Account created successfully! Free access granted.', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    }, 1500);
  });
}

// ── Google OAuth (demo) ─────────────────────────────────────
function loginWithGoogle() {
  showToast('Google sign-in demo. In production, integrate with OAuth 2.0', 'info');
}

function signupWithGoogle() {
  showToast('Google sign-up demo. In production, integrate with OAuth 2.0', 'info');
}

// ── Forgot password link ────────────────────────────────────
document.querySelectorAll('.forgot-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Password reset feature coming soon!', 'info');
  });
});
