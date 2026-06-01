// schedule.js - Doctor Schedule Operatory Book and Grace Period Cancellation
document.addEventListener('DOMContentLoaded', () => {
  const opCol1 = document.getElementById('opCol-1');
  const opCol2 = document.getElementById('opCol-2');
  const opCol3 = document.getElementById('opCol-3');
  const timeLabelsCol = document.getElementById('timeLabelsCol');
  const datePicker = document.getElementById('scheduleDatePicker');
  const directBookForm = document.getElementById('directBookForm');
  const blockoutForm = document.getElementById('blockoutForm');
  
  const bookTimeSelect = document.getElementById('bookTime');
  const bookPatientSelect = document.getElementById('bookPatient');
  const bookOpSelect = document.getElementById('bookOp');
  const blockOpSelect = document.getElementById('blockOp');
  const blockStartSelect = document.getElementById('blockStart');
  const blockEndSelect = document.getElementById('blockEnd');

  function populateDentistScheduleLabels() {
    const columns = DentalSync.getOperatoryColumns();

    columns.forEach(col => {
      const header = document.getElementById(`opHeader-${col.value}`);
      if (header) {
        header.textContent = col.name;
        header.title = col.name;
      }
      const opCol = document.getElementById(`opCol-${col.value}`);
      if (opCol) opCol.dataset.dentist = col.name;
    });

    if (bookOpSelect) {
      const prevBook = bookOpSelect.value;
      bookOpSelect.innerHTML = columns.map(col =>
        `<option value="${col.value}">${col.name}</option>`
      ).join('');
      if (prevBook && columns.some(c => c.value === prevBook)) bookOpSelect.value = prevBook;
    }

    if (blockOpSelect) {
      const prevBlock = blockOpSelect.value;
      blockOpSelect.innerHTML =
        '<option value="all">All Dentists</option>' +
        columns.map(col => `<option value="${col.value}">${col.name}</option>`).join('');
      if (prevBlock) blockOpSelect.value = prevBlock;
    }
  }

  let selectedDateISO = '';
  let currentTimeMinutes = 480; // default 8:00 AM (480 minutes)

  DentalSync.ensurePortalClinic();

  // Initialize dates — today or later only
  const defaultDateStr = DentalSync.getTodayISO();
  datePicker.min = defaultDateStr;
  datePicker.value = defaultDateStr;
  selectedDateISO = defaultDateStr;

  datePicker.addEventListener('change', (e) => {
    const picked = e.target.value;
    if (picked && picked < DentalSync.getTodayISO()) {
      datePicker.value = DentalSync.getTodayISO();
      selectedDateISO = DentalSync.getTodayISO();
      showToast('Past dates cannot be selected.', 'warn');
    } else {
      selectedDateISO = picked;
    }
    renderAll();
  });

  // Render Time Grid labels (8:00 AM to 6:00 PM)
  function renderTimeLabels() {
    timeLabelsCol.innerHTML = '';
    for (let h = 8; h <= 18; h++) {
      const labelDiv = document.createElement('div');
      labelDiv.className = 'time-label-row';
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h > 12 ? h - 12 : h;
      labelDiv.textContent = `${hr}:00 ${ampm}`;
      timeLabelsCol.appendChild(labelDiv);
    }
  }

  // Populate patient dropdown from the clinic patients list
  function populatePatientOptions() {
    if (!bookPatientSelect) return;
    DentalSync.ensureDefaultPatients();
    const previous = bookPatientSelect.value;
    const names = DentalSync.getAllPatientNames();

    bookPatientSelect.innerHTML = '';
    if (names.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No patients in list yet';
      opt.disabled = true;
      opt.selected = true;
      bookPatientSelect.appendChild(opt);
      return;
    }

    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      bookPatientSelect.appendChild(opt);
    });

    if (previous && names.includes(previous)) {
      bookPatientSelect.value = previous;
    }
  }

  // Populate time select dropdown options
  function populateTimeOptions() {
    bookTimeSelect.innerHTML = '';
    blockStartSelect.innerHTML = '';
    blockEndSelect.innerHTML = '';

    for (let m = 480; m < 1080; m += 15) {
      const label = minutesToTimeStr(m);
      
      const opt1 = document.createElement('option');
      opt1.value = label;
      opt1.textContent = label;
      bookTimeSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = m;
      opt2.textContent = label;
      blockStartSelect.appendChild(opt2);

      const opt3 = document.createElement('option');
      opt3.value = m + 15;
      opt3.textContent = minutesToTimeStr(m + 15);
      blockEndSelect.appendChild(opt3);
    }
  }

  // Helper: minutes to standard time label
  function minutesToTimeStr(total) {
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hr12 = ((hh + 11) % 12) + 1;
    return `${hr12}:${mm.toString().padStart(2, '0')} ${ampm}`;
  }

  // Helper: Format YYYY-MM-DD to "May 11, 2026"
  function formatDateLabel(val) {
    if (!val) return '';
    const d = new Date(val + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Clock update for grace-period no-show checks (real time)
  function updateClockDisplay() {
    const now = new Date();
    currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    renderAll();
  }

  // Directly Schedule Patient form submit
  directBookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (datePicker.value && datePicker.value < DentalSync.getTodayISO()) {
      showToast('Cannot schedule on a past date.', 'warn');
      return;
    }
    const patientName = document.getElementById('bookPatient').value;
    const serviceSelect = document.getElementById('bookService');
    const selectedService = serviceSelect.value;
    const durationMinutes = parseInt(serviceSelect.selectedOptions[0].dataset.duration, 10) || 60;
    const op = document.getElementById('bookOp').value;
    const startTimeStr = bookTimeSelect.value;
    
    const startMinutes = DentalSync.parseTimeToMinutes(startTimeStr);
    const endMinutes = startMinutes + durationMinutes;
    const dentist = DentalSync.getDentistNameForOperatory(op) || DentalSync.getDentistName();

    // Check for conflict (all clinic bookings + blocks on this date)
    const appointments = DentalSync.getClinicScheduleAppointments(selectedDateISO);
    const booked = appointments.map(a => DentalSync.getAppointmentRange(a));
    const disabled = DentalSync.getClinicDisabledSlotsForDate(selectedDateISO)
      .filter(d => d.operatory === op || d.operatory === String(op))
      .map(d => ({ start: d.startMinutes, end: d.endMinutes }));
    const conflict = DentalSync.findBookingConflict(startMinutes, endMinutes, [...booked, ...disabled]);
    
    if (conflict) {
      showToast(`Conflict: That slot is already occupied/blocked.`, 'warn');
      return;
    }

    DentalSync.addAppointmentFromDentist({
      patientName,
      dentist,
      service: selectedService,
      durationMinutes,
      duration: `~${durationMinutes} min`,
      date: selectedDateISO,
      time: DentalSync.formatMinutesRange(startMinutes, endMinutes),
      startMinutes,
      endMinutes,
      operatory: op,
      clinicId: DentalSync.getPortalClinicId(),
      clinicName: DentalSync.getPortalClinicName(),
    });

    showToast(`Appointment successfully created for ${patientName}!`, 'success');
    renderAll();
  });

  // Block out hour form submit
  blockoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const reason = document.getElementById('blockReason').value;
    const op = document.getElementById('blockOp').value;
    const startMinutes = parseInt(blockStartSelect.value, 10);
    const endMinutes = parseInt(blockEndSelect.value, 10);

    if (endMinutes <= startMinutes) {
      showToast("End time must be after start time.", "warn");
      return;
    }

    const dentist = DentalSync.getDentistName();

    if (op === 'all') {
      // Add disabled block to each of the 3 rooms
      for (let c = 1; c <= 3; c++) {
        DentalSync.addDisabledSlot({
          date: selectedDateISO,
          startMinutes,
          endMinutes,
          dentist,
          reason,
          operatory: String(c)
        });
      }
    } else {
      DentalSync.addDisabledSlot({
        date: selectedDateISO,
        startMinutes,
        endMinutes,
        dentist,
        reason,
        operatory: op
      });
    }

    showToast(`Successfully blocked out schedule!`, 'success');
    document.getElementById('blockReason').value = '';
    renderAll();
  });

  // Cancel Appointment due to No Show / Grace Period Exceeded
  window.cancelNoShow = function(apptId, patientName) {
    if (!confirm(`Cancel appointment of ${patientName} due to 15-min grace period expiration (No-Show)?`)) return;
    
    const data = DentalSync.load();
    const appt = data.appointments.find(a => a.id === apptId);
    
    if (appt) {
      appt.status = 'cancelled'; // free up the slot
      
      // Send a notification/message to the patient
      data.messages.unshift({
        id: `ds_${Date.now()}`,
        type: 'appointment',
        from: 'dentist',
        patientName: appt.patientName,
        dentist: appt.dentist,
        clinicId: appt.clinicId,
        clinicName: appt.clinicName || 'Clinic',
        subject: 'Appointment Cancelled - Grace Period Expired',
        body: `Dear ${appt.patientName}, your appointment for ${appt.service} scheduled at ${DentalSync.extractStartTime(appt.time)} was cancelled because you did not arrive within the 15-minute grace period.`,
        read: false,
        createdAt: new Date().toISOString()
      });
      
      localStorage.setItem(DentalSync.STORAGE_KEY, JSON.stringify(data));
      global.dispatchEvent(new CustomEvent(DentalSync.UPDATE_EVENT));
      
      showToast(`Appointment of ${patientName} cancelled and slot released.`, 'success');
      renderAll();
    }
  };

  // Remove blockout slot
  window.removeBlockout = function(id) {
    if (!confirm("Remove this schedule block?")) return;
    DentalSync.removeDisabledSlot(id);
    showToast("Schedule block removed.", "success");
    renderAll();
  };

  function appointmentCardClass(appt) {
    if (appt.status === 'confirmed') return 'appt-card-active';
    if (appt.status === 'in_progress') return 'appt-card-inprogress';
    if (appt.source === 'patient') return 'appt-card-online';
    return 'appt-card-pending';
  }

  function updateScheduleBanner() {
    const banner = document.getElementById('scheduleSyncBanner');
    if (!banner) return;
    const appointments = DentalSync.getClinicScheduleAppointments(selectedDateISO);
    const label = DentalSync.formatDisplayDate(selectedDateISO);
    if (!appointments.length) {
      banner.textContent = `No appointments on ${label}. Patient online bookings for Lacsamana Dental Clinic appear here when you select the same date.`;
      return;
    }
    const online = appointments.filter(a => a.source === 'patient').length;
    banner.textContent = `${appointments.length} on ${label}${online ? ` (${online} from patient portal)` : ''}.`;
  }

  // Display appointments & disabled slots in columns
  function renderAll() {
    if (!opCol1 || !opCol2 || !opCol3) return;
    opCol1.innerHTML = '';
    opCol2.innerHTML = '';
    opCol3.innerHTML = '';

    const appointments = DentalSync.getClinicScheduleAppointments(selectedDateISO);
    const disabledSlots = DentalSync.getClinicDisabledSlotsForDate(selectedDateISO);

    if (appointments.length === 0 && disabledSlots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'schedule-empty-hint';
      empty.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.9rem;text-align:center;padding:24px;pointer-events:none;z-index:1;';
      empty.textContent = 'No appointments for this date. Patient online bookings will appear here automatically.';
      opCol1.appendChild(empty);
    }

    // 1. Render appointments (patient portal + direct bookings)
    appointments.forEach(appt => {
      const range = DentalSync.getAppointmentRange(appt);
      const start = range.start;
      const duration = Math.max(range.end - range.start, 30);
      const op = DentalSync.resolveOperatoryForAppointment(appt);

      const card = document.createElement('div');
      card.className = `schedule-block-card ${appointmentCardClass(appt)}`;

      const topOffset = Math.max(0, start - 480);
      card.style.top = `${topOffset}px`;
      card.style.height = `${duration}px`;

      const timeLabel = DentalSync.extractStartTime(appt.time);
      const sourceLabel = appt.source === 'patient' ? ' · Online booking' : '';
      card.innerHTML = `
        <div>
          <div class="schedule-block-title">${appt.patientName}</div>
          <div class="schedule-block-meta">${appt.service} · ${timeLabel}${sourceLabel}</div>
          <div class="schedule-block-meta" style="margin-top:4px;opacity:0.95;">${appt.dentist || '—'}</div>
        </div>
      `;

      const dateContextObj = selectedDateISO
        ? new Date(selectedDateISO + 'T12:00:00')
        : new Date();
      const isTodayStr = dateContextObj.toDateString() === new Date().toDateString();

      if (isTodayStr && (appt.status === 'pending' || appt.status === 'confirmed' || appt.status === 'in_progress')) {
        if (currentTimeMinutes >= start + 15) {
          const meta = card.querySelector('.schedule-block-meta');
          const warnText = document.createElement('span');
          warnText.className = 'grace-alert-text';
          warnText.innerHTML = ' · ⚠️ Late 15m+';
          meta.appendChild(warnText);

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'grace-period-btn';
          cancelBtn.innerHTML = 'Cancel No-Show';
          cancelBtn.onclick = (e) => {
            e.stopPropagation();
            cancelNoShow(appt.id, appt.patientName);
          };
          card.appendChild(cancelBtn);
        }
      }

      appendCardToCol(card, op);
    });

    // 2. Render disabled slot blockouts
    disabledSlots.forEach(block => {
      const start = block.startMinutes;
      const duration = block.endMinutes - block.startMinutes;
      const op = block.operatory || '1';

      const card = document.createElement('div');
      card.className = 'schedule-block-card appt-card-disabled';
      
      const topOffset = Math.max(0, start - 480);
      card.style.top = `${topOffset}px`;
      card.style.height = `${duration}px`;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div>
            <div class="schedule-block-title" style="color:#e2e8f0;">🚫 ${block.reason || 'Blocked Out'}</div>
            <div class="schedule-block-meta" style="color:#94a3b8;">${minutesToTimeStr(start)} – ${minutesToTimeStr(block.endMinutes)}</div>
          </div>
          <button type="button" class="blockout-remover" onclick="removeBlockout('${block.id}')" title="Delete block">✕</button>
        </div>
      `;

      appendCardToCol(card, op);
    });

    updateScheduleBanner();
  }

  function appendCardToCol(card, op) {
    if (op === '1') opCol1.appendChild(card);
    else if (op === '2') opCol2.appendChild(card);
    else if (op === '3') opCol3.appendChild(card);
  }

  // Toast notifications helper
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  // Init
  populateDentistScheduleLabels();
  renderTimeLabels();
  populateTimeOptions();
  populatePatientOptions();
  updateClockDisplay();
  setInterval(updateClockDisplay, 60000);

  DentalSync.onUpdate(() => {
    populatePatientOptions();
    populateDentistScheduleLabels();
    renderAll();
  });
});
