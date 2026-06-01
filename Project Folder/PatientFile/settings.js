// settings.js — Toggle switches and action buttons

// ── Theme Toggle (Dark Mode) ────────────────────────────────
const themeToggle = document.getElementById('toggleTheme');
const themeDesc   = document.getElementById('themeDesc');

function syncThemeUI() {
  const isDark = document.body.classList.contains('dark-mode');
  if (themeToggle) themeToggle.checked = isDark;
  if (themeDesc)   themeDesc.textContent = isDark ? 'Currently using dark mode' : 'Currently using light mode';
}

// Apply on load (shared.js already added the class; we just sync the toggle)
syncThemeUI();

if (themeToggle) {
  themeToggle.addEventListener('change', () => {
    const enableDark = themeToggle.checked;
    document.body.classList.toggle('dark-mode', enableDark);
    localStorage.setItem('theme', enableDark ? 'dark' : 'light');
    syncThemeUI();
    showToast(enableDark ? '🌙 Dark mode enabled.' : '☀️ Light mode enabled.', 'success');
  });
}

// ── Generic toggle feedback ────────────────────────────────────────────────
const toggleLabels = {
  toggleCompact:     'Compact view toggled.',
  toggleEmail:       'Email notifications updated.',
  toggleSMS:         'SMS reminders updated.',
  togglePush:        'Push notifications updated.',
  toggle2FA:         'Two-factor authentication updated.',
  toggleLoginAlerts: 'Login alerts updated.',
};

Object.entries(toggleLabels).forEach(([id, msg]) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    showToast(`⚙️ ${msg}`, 'success');
  });
});

// ── Buttons ────────────────────────────────────────────────
document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
  showToast('🔑 Password change flow coming soon.', 'info');
});

document.getElementById('exportDataBtn')?.addEventListener('click', () => {
  showToast('⬇️ Preparing your data export… (demo)', 'info');
});

document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
  const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
  if (confirmed) {
    showToast('⚠️ Account deletion request submitted. (demo)', 'info');
  }
});
