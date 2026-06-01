// records.js — Tabs + synced dental history from confirmed visits

const tabs = document.querySelectorAll('#recordTabs .tab');
const tabContents = {
  history: document.getElementById('tab-history'),
  docs: document.getElementById('tab-docs'),
  rx: document.getElementById('tab-rx'),
};
const historyBody = document.getElementById('recordsHistoryBody');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const key = tab.dataset.tab;
    Object.entries(tabContents).forEach(([k, el]) => {
      if (el) el.classList.toggle('hidden', k !== key);
    });
  });
});

function renderPatientRecords() {
  if (!historyBody || typeof DentalSync === 'undefined') return;
  const records = DentalSync.getPatientRecords(DentalSync.getPatientName());

  if (!records.length) {
    historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No confirmed visits yet. Records appear here after your dentist confirms an appointment.</td></tr>`;
    return;
  }

  historyBody.innerHTML = records.map(rec => {
    const dentist = rec.dentist || '—';
    const clinic = rec.clinicName ? `<br/><span style="color:var(--text-muted);font-size:0.85rem;">${rec.clinicName}</span>` : '';
    return `
    <tr>
      <td>${DentalSync.formatBookingDate(rec.date)}</td>
      <td>${rec.procedure}</td>
      <td>${dentist}${clinic}</td>
      <td style="color:var(--text-muted);">${rec.notes || '—'}</td>
      <td><span class="status-pill completed">✔ ${rec.status || 'Completed'}</span></td>
    </tr>
  `;
  }).join('');
}

document.querySelectorAll('#tab-docs .btn').forEach(btn => {
  btn.addEventListener('click', () => showToast('Downloading document… (demo)', 'info'));
});

renderPatientRecords();
if (typeof DentalSync !== 'undefined') {
  DentalSync.onUpdate(renderPatientRecords);
}
