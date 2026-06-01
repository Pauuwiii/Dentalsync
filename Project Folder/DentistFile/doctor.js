const doctorActions = document.querySelectorAll('.doctor-action');
const patientTableBody = document.getElementById('patientsTableBody');
const newPatientCard = document.getElementById('newPatientCard');
const cancelAddPatientBtn = document.getElementById('cancelAddPatient');
const newPatientForm = document.getElementById('newPatientForm');
const activePatientCount = document.getElementById('activePatientCount');
const patientSearchInput = document.getElementById('patientSearchInput');
const careNotesList = document.getElementById('careNotesList');
const patientRecordCard = document.getElementById('patientRecordCard');
const recordPatientName = document.getElementById('recordPatientName');
const recordDetails = document.getElementById('recordDetails');
const recordHistory = document.getElementById('recordHistory');
const addRecordCard = document.getElementById('addRecordCard');
const addRecordForm = document.getElementById('addRecordForm');
const addRecordPatientName = document.getElementById('addRecordPatientName');
const cancelAddRecordBtn = document.getElementById('cancelAddRecord');
const themeToggle = document.getElementById('themeToggle');

const patientRecords = {
  'Maria Lopez': {
    summary: 'Last checkup was clean. Recommended fluoride treatment at the next visit.',
    history: [
      { date: 'Apr 12, 2026', note: 'Semi-annual checkup; no cavities found.' },
      { date: 'May 4, 2026', note: 'Teeth cleaning completed.' }
    ]
  },
  'John Bautista': {
    summary: 'Root canal in progress. Monitor pain management and healing.',
    history: [
      { date: 'Apr 28, 2026', note: 'Initial root canal consultation.' },
      { date: 'May 7, 2026', note: 'Root canal session 1 completed.' }
    ]
  },
  'Rosa Dela Cruz': {
    summary: 'Review fillings status and schedule follow-up.' ,
    history: [
      { date: 'Apr 22, 2026', note: 'Cavity assessment completed.' },
      { date: 'May 8, 2026', note: 'Fillings placed on upper molars.' }
    ]
  },
  'Kevin Ong': {
    summary: 'Consultation completed, treatment plan prepared.',
    history: [
      { date: 'May 1, 2026', note: 'Consultation booked for jaw pain.' },
      { date: 'May 9, 2026', note: 'Consultation appointment completed.' }
    ]
  },
  'Luna Santos': {
    summary: 'Cavity filling scheduled; verify anesthesia consent before treatment.',
    history: [
      { date: 'May 3, 2026', note: 'Cavity identified on lower molar.' },
      { date: 'May 10, 2026', note: 'Treatment plan created for filling.' }
    ]
  }
};

let editingRow = null;
let currentRecordRow = null;

function attachPatientRowListener(row) {
  row.addEventListener('click', () => {
    document.querySelectorAll('.patient-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    const name = row.children[0].textContent;
    showToast(`Selected patient: ${name}`);
  });
}

function updatePatientCount(amount) {
  if (!activePatientCount) return;
  const currentText = activePatientCount.textContent || '';
  const current = parseInt(currentText, 10) || 0;
  activePatientCount.textContent = `${current + amount} patients with appointments or active care plans`;
}

function addCareNote(name, note) {
  if (!careNotesList) return;
  const item = document.createElement('div');
  item.className = 'hist-item';
  item.innerHTML = `
    <p class="hist-title">${name}</p>
    <p class="hist-meta">${note}</p>
  `;
  careNotesList.appendChild(item);
}

function renderRecordHistory(entries) {
  if (!recordHistory) return;
  recordHistory.innerHTML = entries.map(entry => `
    <div class="hist-item">
      <p class="hist-title">${entry.date}</p>
      <p class="hist-meta">${entry.note}</p>
      ${entry.dentist ? `<p class="hist-meta" style="margin-top:6px;color:var(--primary);">Attending dentist: ${entry.dentist}</p>` : ''}
    </div>
  `).join('');
}

function filterPatients() {
  if (!patientSearchInput || !patientTableBody) return;
  const query = patientSearchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  const rows = patientTableBody.querySelectorAll('tr.patient-row');
  rows.forEach(row => {
    const name = row.children[0]?.textContent.trim().toLowerCase() || '';
    const matches = name.includes(query);
    row.style.display = matches ? '' : 'none';
    if (matches) visibleCount += 1;
  });

  const noResultsRow = patientTableBody.querySelector('#noResultsRow');
  if (visibleCount === 0) {
    if (!noResultsRow) {
      const row = document.createElement('tr');
      row.id = 'noResultsRow';
      row.innerHTML = `<td colspan="3" style="text-align:center; color:var(--text-muted); padding:24px;">No matching patients found.</td>`;
      patientTableBody.appendChild(row);
    }
  } else if (noResultsRow) {
    noResultsRow.remove();
  }
}

function showPatientRecord(name, rowInfo = {}) {
  if (!patientRecordCard || !recordPatientName || !recordDetails) return;

  if (typeof DentalSync !== 'undefined') {
    const synced = DentalSync.getPatientRecords(name);
    if (synced.length) {
      recordPatientName.textContent = name;
      const latest = synced[0];
      recordDetails.innerHTML = `${latest.notes || latest.procedure}<br/><span style="display:block; margin-top:8px; color:var(--text-muted);">Last visit: ${latest.date} · ${latest.procedure} · ${latest.dentist || ''}</span>`;
      renderRecordHistory(synced.map(r => ({
        date: r.date,
        note: `${r.procedure}${r.notes ? ': ' + r.notes : ''}`,
        dentist: r.dentist,
      })));
      patientRecordCard.style.display = 'block';
      return;
    }
  }

  const record = patientRecords[name] || null;
  recordPatientName.textContent = name;

  const dateDetails = `Last visit: ${rowInfo.lastVisit || 'N/A'}`;
  const treatmentDetails = `Last treatment: ${rowInfo.lastTreatment || rowInfo.condition || 'N/A'}`;
  const nextDetails = `Next appt: ${rowInfo.nextAppointment || 'N/A'}`;
  const summary = record ? record.summary : `Review the patient history and upcoming care plan.`;
  recordDetails.innerHTML = `${summary}<br/><span style="display:block; margin-top:8px; color:var(--text-muted);">${dateDetails} · ${treatmentDetails} · ${nextDetails}</span>`;

  if (record) {
    renderRecordHistory(record.history);
  } else {
    renderRecordHistory([
      { date: rowInfo.lastVisit || 'No previous visit', note: rowInfo.note || 'No past record details available.' }
    ]);
  }

  patientRecordCard.style.display = 'block';
}

function createPatientRow({ name, lastVisit, lastTreatment = '', nextAppointment, condition, status, statusClass, note = '' }) {
  if (!patientTableBody) return;
  const row = document.createElement('tr');
  row.className = 'patient-row';
  row.dataset.lastVisit = lastVisit;
  row.dataset.lastTreatment = lastTreatment;
  row.dataset.nextAppointment = nextAppointment;
  row.dataset.condition = condition;
  row.dataset.note = note;
  row.innerHTML = `
    <td>${name}</td>
    <td><span class="status-pill ${statusClass}">${status}</span></td>
    <td>
      <button class="btn btn-secondary btn-sm view-patient" data-patient="${name}">View</button>
      
      <button class="btn btn-outline btn-sm unview-patient" type="button">Unview</button>
      <button class="btn btn-primary btn-sm edit-patient" type="button">Edit</button>
      <button class="btn btn-danger btn-sm delete-patient" type="button">Delete</button>
    </td>
  `;
  attachPatientRowListener(row);
  patientTableBody.appendChild(row);
  updatePatientCount(1);

  if (typeof DentalSync !== 'undefined') {
    DentalSync.upsertClinicPatient({ name, lastVisit, lastTreatment, nextAppointment, condition, status, statusClass, note });
  }
}

function startEditRow(row) {
  // Repurposed: open the Add Record form for the selected patient
  if (!row || !addRecordCard || !addRecordForm) return;
  currentRecordRow = row;
  const name = row.children[0].textContent.trim();
  addRecordPatientName.textContent = name;
  // prefill date with today-ish string
  document.getElementById('recordDate').value = '';
  document.getElementById('recordTreatment').value = row.dataset.lastTreatment || '';
  document.getElementById('recordNote').value = '';
  addRecordCard.style.display = 'block';
  // ensure the Add Patient card is hidden
  if (newPatientCard) newPatientCard.style.display = 'none';
}

function applyEdit(row, values) {
  if (!row) return;
  const oldName = row.children[0].textContent.trim();
  row.children[0].textContent = values.name;
  const statusSpan = row.querySelector('.status-pill');
  if (statusSpan) {
    statusSpan.textContent = values.status;
    statusSpan.className = `status-pill ${values.statusClass}`;
  }
  row.dataset.lastVisit = values.lastVisit;
  row.dataset.lastTreatment = values.lastTreatment;
  row.dataset.nextAppointment = values.nextAppointment;
  row.dataset.condition = values.condition;
  row.dataset.note = values.note || '';

  // Update care notes list: replace title and meta where matching oldName
  const notes = document.querySelectorAll('#careNotesList .hist-item');
  notes.forEach(n => {
    const title = n.querySelector('.hist-title');
    const meta = n.querySelector('.hist-meta');
    if (title && title.textContent.trim() === oldName) {
      title.textContent = values.name;
      if (meta && values.note) meta.textContent = values.note;
    }
  });

  // Move patientRecords entry if exists
  if (patientRecords[oldName]) {
    patientRecords[values.name] = { ...patientRecords[oldName] };
    delete patientRecords[oldName];
  }
  // Update view button dataset to point to new name
  const viewBtn = row.querySelector('.view-patient');
  if (viewBtn) viewBtn.dataset.patient = values.name;
}

doctorActions.forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'refresh') {
      // Handled by portal-sync.js on appointments page
      if (!document.getElementById('appointmentQueueBody')) {
        showToast('Schedule refreshed.');
      }
    } else if (action === 'new') {
      if (newPatientCard) {
        newPatientCard.style.display = newPatientCard.style.display === 'none' ? 'block' : 'none';
      }
    } else if (action === 'view') {
      showToast('Opening appointment details...');
    } else if (action === 'export') {
      showToast('Patient list exported successfully.');
    }
  });
});

if (patientTableBody) {
  patientTableBody.addEventListener('click', event => {
    const viewButton = event.target.closest('.view-patient');
    if (viewButton) {
      const row = viewButton.closest('tr');
      if (!row) return;
      showPatientRecord(viewButton.dataset.patient, {
        lastVisit: row.dataset.lastVisit,
        lastTreatment: row.dataset.lastTreatment,
        nextAppointment: row.dataset.nextAppointment,
        condition: row.dataset.condition,
        note: row.dataset.note || ''
      });
      return;
    }
    const unviewButton = event.target.closest('.unview-patient');
    if (unviewButton && patientRecordCard) {
      patientRecordCard.style.display = 'none';
      showToast('Patient record hidden.');
      return;
    }

    const editButton = event.target.closest('.edit-patient');
    if (editButton) {
        const row = editButton.closest('tr');
        startEditRow(row);
      return;
    }

    const deleteButton = event.target.closest('.delete-patient');
    if (deleteButton) {
      const row = deleteButton.closest('tr');
      if (!row) return;
      const name = row.children[0].textContent.trim();
      if (!confirm(`Delete patient record for ${name}? This cannot be undone.`)) return;
      // remove care notes for this patient
      const notes = document.querySelectorAll('#careNotesList .hist-item');
      notes.forEach(n => {
        const title = n.querySelector('.hist-title');
        if (title && title.textContent.trim() === name) n.remove();
      });
      // remove data model
      if (patientRecords[name]) delete patientRecords[name];
      row.remove();
      updatePatientCount(-1);
      showToast(`Deleted patient: ${name}`, 'success');
      return;
    }
  });
}

if (newPatientForm) {
  newPatientForm.addEventListener('submit', event => {
    event.preventDefault();

    const name = document.getElementById('patientName').value.trim();
    const lastVisit = document.getElementById('patientLastVisit').value.trim();
    const lastTreatment = document.getElementById('patientLastTreatment') ? document.getElementById('patientLastTreatment').value.trim() : '';
    const nextAppointment = document.getElementById('patientNextAppointment').value.trim();
    const condition = document.getElementById('patientCondition').value.trim();
    const status = document.getElementById('patientStatus').value;
    const note = document.getElementById('patientNote').value.trim();

    if (!name || !lastVisit || !nextAppointment || !condition || !status) {
      showToast('Please complete all required fields.', 'error');
      return;
    }

    const statusClass = status === 'Confirmed' ? 'completed' : status === 'Scheduled' ? 'warning' : status === 'Stable' ? 'completed' : status === 'Review' ? 'teal' : 'warning';
    if (editingRow) {
      applyEdit(editingRow, { name, lastVisit, lastTreatment, nextAppointment, condition, status, statusClass, note });
      showToast(`Patient record updated for ${name}.`, 'success');
      editingRow = null;
      const submitBtn = newPatientForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Add Patient';
    } else {
      createPatientRow({ name, lastVisit, lastTreatment, nextAppointment, condition, status, statusClass, note });
      if (note) addCareNote(name, note);
      showToast(`Patient record added for ${name}.`, 'success');
    }

    newPatientForm.reset();
    if (newPatientCard) newPatientCard.style.display = 'none';
    filterPatients();
  });
}

if (addRecordForm) {
  addRecordForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!currentRecordRow) return;
    const name = currentRecordRow.children[0].textContent.trim();
    const date = document.getElementById('recordDate').value.trim();
    const treatment = document.getElementById('recordTreatment').value.trim();
    const note = document.getElementById('recordNote').value.trim();

    if (!date) {
      showToast('Please provide a date for the record.', 'error');
      return;
    }

    // ensure patientRecords entry exists
    if (!patientRecords[name]) {
      patientRecords[name] = { summary: `New record for ${name}.`, history: [] };
    }
    // prepend new history entry
    patientRecords[name].history.unshift({ date, note: note || (treatment || 'No details') });

    // update row dataset for last visit / treatment
    currentRecordRow.dataset.lastVisit = date;
    if (treatment) currentRecordRow.dataset.lastTreatment = treatment;

    // update visible record panel if open for the same patient
    if (patientRecordCard && patientRecordCard.style.display !== 'none' && recordPatientName.textContent.trim() === name) {
      showPatientRecord(name, {
        lastVisit: currentRecordRow.dataset.lastVisit,
        lastTreatment: currentRecordRow.dataset.lastTreatment,
        nextAppointment: currentRecordRow.dataset.nextAppointment,
        condition: currentRecordRow.dataset.condition,
        note: currentRecordRow.dataset.note || ''
      });
    }

    if (note) addCareNote(name, note);
    showToast(`Added record for ${name}.`, 'success');
    addRecordForm.reset();
    if (addRecordCard) addRecordCard.style.display = 'none';
    currentRecordRow = null;
  });
}

if (cancelAddRecordBtn) {
  cancelAddRecordBtn.addEventListener('click', () => {
    if (addRecordCard) addRecordCard.style.display = 'none';
    if (addRecordForm) addRecordForm.reset();
    currentRecordRow = null;
  });
}

if (cancelAddPatientBtn) {
  cancelAddPatientBtn.addEventListener('click', () => {
    if (newPatientCard) newPatientCard.style.display = 'none';
    if (newPatientForm) newPatientForm.reset();
    if (patientSearchInput) patientSearchInput.value = '';
    filterPatients();
  });
}

if (patientSearchInput) {
  patientSearchInput.addEventListener('input', filterPatients);
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    showToast(`Theme switched to ${isDark ? 'dark' : 'light'} mode.`);
  });
}

function seedStaticPatientsToSync() {
  if (!patientTableBody || typeof DentalSync === 'undefined') return;
  patientTableBody.querySelectorAll('.patient-row').forEach(row => {
    const name = row.children[0]?.textContent.trim();
    if (!name) return;
    DentalSync.upsertClinicPatient({
      name,
      lastVisit: row.dataset.lastVisit,
      lastTreatment: row.dataset.lastTreatment,
      nextAppointment: row.dataset.nextAppointment,
      condition: row.dataset.condition,
      status: row.querySelector('.status-pill')?.textContent.trim(),
      note: row.dataset.note || '',
    });
  });
}

const existingRows = patientTableBody ? patientTableBody.querySelectorAll('.patient-row') : [];
existingRows.forEach(attachPatientRowListener);

seedStaticPatientsToSync();

function getRowByPatientName(name) {
  if (!patientTableBody) return null;
  return [...patientTableBody.querySelectorAll('.patient-row')].find(
    r => r.children[0]?.textContent.trim() === name
  );
}

function resetPatientCount() {
  if (!activePatientCount || !patientTableBody) return;
  const count = patientTableBody.querySelectorAll('.patient-row').length;
  activePatientCount.textContent = `${count} patients with appointments or active care plans`;
}

function upsertSyncedPatient(p) {
  const existing = getRowByPatientName(p.name);
  const payload = {
    name: p.name,
    lastVisit: p.lastVisit || '—',
    lastTreatment: p.lastTreatment || p.condition || '—',
    nextAppointment: p.nextAppointment || '—',
    condition: p.condition || p.lastTreatment || '—',
    status: p.status || 'Stable',
    statusClass: p.statusClass || 'completed',
    note: p.note || '',
  };
  if (existing) {
    applyEdit(existing, payload);
  } else {
    createPatientRow(payload);
    if (payload.note) addCareNote(p.name, payload.note);
  }
}

function syncFromDentalSync() {
  if (!patientTableBody || typeof DentalSync === 'undefined') return;
  DentalSync.getClinicPatients().forEach(upsertSyncedPatient);
  DentalSync.getPatientRecords().forEach(rec => {
    if (!patientRecords[rec.patientName]) {
      patientRecords[rec.patientName] = { summary: rec.notes || '', history: [] };
    }
    const note = `${rec.procedure}${rec.notes ? ': ' + rec.notes : ''}`;
    const dup = patientRecords[rec.patientName].history.some(
      h => h.date === rec.date && h.note === note
    );
    if (!dup) {
      patientRecords[rec.patientName].history.unshift({ date: rec.date, note, dentist: rec.dentist });
    }
  });
  resetPatientCount();
}

syncFromDentalSync();
if (patientTableBody) {
  if (typeof DentalSync !== 'undefined') {
    DentalSync.onUpdate(syncFromDentalSync);
  }
}
