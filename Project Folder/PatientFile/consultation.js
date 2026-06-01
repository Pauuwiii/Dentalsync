// consultation.js — Type chips, Symptom chips, Form submission

document.querySelectorAll('#typeChips .type-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#typeChips .type-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

document.querySelectorAll('#symptomChips .symptom-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('active');
  });
});

document.getElementById('submitConsultBtn').addEventListener('click', () => {
  const type = document.querySelector('#typeChips .type-chip.active')?.textContent?.trim();
  const symptoms = [...document.querySelectorAll('#symptomChips .symptom-chip.active')]
    .map(c => c.textContent.replace(/^[^\w]+/, '').trim())
    .join(', ');
  const dentist = document.getElementById('consultDentist').value;
  const date = document.getElementById('consultDate').value;
  const time = document.getElementById('consultTime').value;
  const notes = document.getElementById('consultNotes')?.value.trim() || '';

  if (!date || !time) {
    showToast('Please pick a preferred date and time.', 'warn');
    return;
  }

  if (typeof DentalSync !== 'undefined' && DentalSync.isPastDateValue(date)) {
    showToast('Past dates cannot be selected.', 'warn');
    return;
  }

  const clinic = DentalSync.CLINICS.find(c => c.dentist === dentist)
    || DentalSync.CLINICS[0];
  const dentistName = dentist === 'Any Available Dentist' ? clinic.dentist : dentist;
  const matchedClinic = DentalSync.CLINICS.find(c => c.dentist === dentistName) || clinic;

  const detail = symptoms
    ? `Concern: ${symptoms}${notes ? `. Notes: ${notes}` : ''}`
    : notes || 'No additional notes';

  DentalSync.addMessage({
    type: 'consultation',
    clinicId: matchedClinic.id,
    clinicName: matchedClinic.name,
    dentist: dentistName,
    subject: `${type} consultation request`,
    body: `${DentalSync.getPatientName()} requested a ${type} consultation on ${date} at ${time}. ${detail}`,
  });

  showToast(`✅ Consultation request sent to ${matchedClinic.name}. Your dentist will receive it.`, 'success');
});
