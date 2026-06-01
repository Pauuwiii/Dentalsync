// shared.js — runs on every page

// ── Theme initialisation ────────────────────────────────────
// Light mode is the default; dark mode is opt-in via settings.
(function applyTheme() {
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
})();

// ── Subscription gate ───────────────────────────────────────
// Subscription checks have been removed for the patient portal.

// ── Toast utility ──────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.style.borderColor = type === 'success' ? 'var(--success)' : 'var(--primary)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ── Sign Out button ────────────────────────────────────────
document.querySelectorAll('.sign-out').forEach(btn => {
  btn.addEventListener('click', () => {
    showToast('You have been signed out. Redirecting…');
    setTimeout(() => window.location.href = 'login.html', 1800);
  });
});

function initNoPastDates() {
  if (typeof DentalSync !== 'undefined' && DentalSync.applyNoPastDateInputs) {
    DentalSync.applyNoPastDateInputs();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNoPastDates);
} else {
  initNoPastDates();
}

// ── Search (demo) ──────────────────────────────────────────
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      showToast(`Searching for "${searchInput.value.trim()}"…`);
    }
  });
}
