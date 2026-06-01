// appointments.js — Calendar, Slots, Dentist, Service, Booking

let selectedDate = null;
let selectedDateISO = null;
let selectedTime = null;
let selectedStartTime = null;
let selectedEndTime = null;
let selectedClinic = null;
let selectedDentist = null;
let selectedService = 'Cleaning';
let selectedDuration = '~60 min';
let selectedDurationMinutes = 60;
const consultationNotesWrap = document.getElementById('consultationNotesWrap');
const consultationNotesInput = document.getElementById('consultationNotes');

function readDurationFromUI() {
  const activeChip = document.querySelector('#serviceChips .chip.active');
  if (activeChip) {
    selectedService = activeChip.dataset.service || selectedService;
    if (activeChip.dataset.dur) {
      selectedDuration = activeChip.dataset.dur;
      selectedDurationMinutes = parseDurationToMinutes(selectedDuration);
    }
    if (activeChip.dataset.minutes) {
      const chipMinutes = parseInt(activeChip.dataset.minutes, 10);
      if (chipMinutes >= 5) selectedDurationMinutes = chipMinutes;
    }
  }
  return Math.max(5, selectedDurationMinutes || 60);
}

function updateConsultationNotesVisibility() {
  if (!consultationNotesWrap) return;
  const show = selectedService === 'Consultation';
  consultationNotesWrap.classList.toggle('hidden', !show);
}

const clinicStartMinutes = 8 * 60;
const clinicEndMinutes = 18 * 60;
const SLOT_GRID_STEP = 15; // fine grid; next slot after each booking end is always offered

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const calendarDays = document.getElementById('calendarDays');
const monthLabel = document.getElementById('calMonthLabel');
const dateLabel = document.getElementById('selectedDateLabel');
const CALENDAR_ROWS = 6;
const CALENDAR_COLS = 7;

const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();

const clinics = [
  {
    id: 'brual-putok',
    name: 'Brual Dental Clinic',
    address: 'Putok Rd. Poblacion II, Bauan Batangas',
    avatar: 'BD',
    avatarClass: '',
    dentists: [
      { name: 'Dr. Rosita A. Brual', specialty: 'General Dentist', avatar: 'RB', avatarClass: '' }
    ]
  },
  {
    id: 'brual-ortho',
    name: 'Brual Orthodontics Center',
    address: '2 San Sebastian St, Bauan Batangas',
    avatar: 'BO',
    avatarClass: 'purple',
    dentists: [
      { name: 'Dr. Marissa Brual', specialty: 'Dentist / Orthodontics', avatar: 'MB', avatarClass: 'purple' }
    ]
  },
  {
    id: 'lacsamana',
    name: 'Lacsamana Dental Clinic',
    address: 'Kapitan Ponso St, Bauan Batangas',
    avatar: 'LD',
    avatarClass: 'pink',
    dentists: [
      { name: 'Dr. Sherlyn Lacsamana', specialty: 'General Dentist', avatar: 'SL', avatarClass: 'pink' },
      { name: 'Dr. Jennelyn Magsino', specialty: 'General Dentist', avatar: 'JM', avatarClass: 'pink' },
      { name: 'Dr. Sunshine Lacsamana', specialty: 'General Dentist', avatar: 'SL', avatarClass: 'pink' }
    ]
  },
  {
    id: 'bacong',
    name: 'Bacong Dental & Orthodontics',
    address: 'Poblacion I, Bauan Batangas',
    avatar: 'BC',
    avatarClass: 'green',
    dentists: [
      { name: 'Dr. Jeremiah A. Bacong', specialty: 'Oral Surgeon / General Dentist / Orthodontics', avatar: 'JB', avatarClass: 'green' }
    ]
  }
];

const clinicListEl = document.getElementById('clinicList');
const dentistListEl = document.getElementById('dentistList');
const clinicStepEl = document.getElementById('clinicStep');
const dentistStepEl = document.getElementById('dentistStep');
const selectedClinicLabelEl = document.getElementById('selectedClinicLabel');

function getActiveDateISO() {
  return selectedDateISO || (selectedDate && DentalSync.toISODateString(selectedDate)) || '';
}

function getBookedRangesForDateStr(dateStr) {
  const iso = dateStr ? DentalSync.toISODateString(dateStr) : getActiveDateISO();
  if (!iso || !selectedDentist) return [];
  const clinicId = selectedClinic ? selectedClinic.id : null;
  return DentalSync.getBookedRangesForDate(iso, selectedDentist, clinicId);
}

function generateSlotStartTimes(durationMinutes, dateStr) {
  const duration = durationMinutes ?? readDurationFromUI();
  const candidates = new Set();
  const booked = dateStr ? getBookedRangesForDateStr(dateStr) : getBookedRangesForSelectedDate();

  for (let m = clinicStartMinutes; m + duration <= clinicEndMinutes; m += SLOT_GRID_STEP) {
    candidates.add(m);
  }

  booked.forEach(range => {
    if (range.end + duration <= clinicEndMinutes && range.end >= clinicStartMinutes) {
      candidates.add(range.end);
    }
  });

  return [...candidates].sort((a, b) => a - b).map(minutesToTimeStr);
}

function getAvailableStartTimes(duration, dateStr, isToday, nowMinutes) {
  const available = [];
  let m = clinicStartMinutes;

  while (m + duration <= clinicEndMinutes) {
    const status = getSlotStatus(m, isToday, nowMinutes, duration);

    if (status.ok) {
      available.push(minutesToTimeStr(m));
      m += duration;
      continue;
    }

    if (status.type === 'booked' && status.conflict && m < status.conflict.end) {
      m = status.conflict.end;
      continue;
    }

    if (status.type === 'past' && isToday && m < nowMinutes) {
      m = Math.max(m + SLOT_GRID_STEP, nowMinutes);
      continue;
    }

    m += SLOT_GRID_STEP;
  }

  return available;
}

function parseTimeToMinutes(t) {
  return DentalSync.parseTimeToMinutes(t);
}

function minutesToTimeStr(total) {
  total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hr12 = ((hh + 11) % 12) + 1;
  return `${hr12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

function parseDurationToMinutes(durStr) {
  const m = durStr.match(/(\d+)\s*min/);
  return m ? parseInt(m[1], 10) : 0;
}

function getBookedRangesForSelectedDate() {
  if (!getActiveDateISO() || !selectedDentist) return [];
  const clinicId = selectedClinic ? selectedClinic.id : null;
  return DentalSync.getBookedRangesForDate(getActiveDateISO(), selectedDentist, clinicId);
}

function getSlotStatus(slotMinutes, isToday, nowMinutes, durationMinutes) {
  const dur = durationMinutes ?? selectedDurationMinutes;
  const slotEnd = slotMinutes + dur;

  if (slotEnd > clinicEndMinutes) {
    return {
      ok: false,
      reason: `Needs ${dur} min — would end at ${minutesToTimeStr(slotEnd)} (after closing)`,
      type: 'duration',
    };
  }

  if (isToday && slotMinutes < nowMinutes) {
    return { ok: false, reason: 'This start time has already passed', type: 'past' };
  }

  const booked = getBookedRangesForSelectedDate();
  const conflict = DentalSync.findBookingConflict(slotMinutes, slotMinutes + dur, booked);
  if (conflict) {
    const scope = DentalSync.formatMinutesRange(conflict.start, conflict.end);
    return {
      ok: false,
      reason: `Unavailable ${scope} is already booked`,
      type: 'booked',
      conflict,
    };
  }

  return { ok: true, reason: '', type: 'available' };
}

function isSlotAvailable(slotMinutes, isToday, nowMinutes) {
  return getSlotStatus(slotMinutes, isToday, nowMinutes).ok;
}

function countAvailableSlots(year, month, day) {
  const duration = readDurationFromUI();
  const { isToday, nowMinutes } = getDateContext(year, month, day);
  const dateStr = `${months[month].slice(0, 3)} ${day}, ${year}`;
  const clinicId = selectedClinic ? selectedClinic.id : null;
  const booked = selectedDentist ? DentalSync.getBookedRangesForDate(dateStr, selectedDentist, clinicId) : [];

  return getAvailableStartTimes(duration, dateStr, isToday, nowMinutes).length;
}

function updateSummary() {
  document.getElementById('sumDate').textContent = selectedDate
    ? (DentalSync.formatDisplayDate(getActiveDateISO()) || selectedDate)
    : 'Not selected';
  if (selectedStartTime && selectedEndTime) {
    document.getElementById('sumTime').textContent = `${selectedStartTime} - ${selectedEndTime}`;
  } else {
    document.getElementById('sumTime').textContent = selectedTime || 'Not selected';
  }
  document.getElementById('sumClinic').textContent = selectedClinic ? selectedClinic.name : 'Not selected';
  document.getElementById('sumDentist').textContent = selectedDentist || 'Not selected';
  document.getElementById('sumService').textContent = selectedService;
  document.getElementById('sumDuration').textContent = selectedDuration;
}

function validateSelectedSlot() {
  if (!selectedStartTime || !selectedDate) return;

  const duration = readDurationFromUI();
  const selDateObj = new Date(selectedDate);
  const today = new Date();
  const isToday = selDateObj.toDateString() === today.toDateString();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const slotMinutes = parseTimeToMinutes(selectedStartTime);
  const status = getSlotStatus(slotMinutes, isToday, nowMinutes, duration);

  if (!status.ok) {
    selectedTime = null;
    selectedStartTime = null;
    selectedEndTime = null;
  } else {
    selectedEndTime = minutesToTimeStr(slotMinutes + duration);
    selectedTime = `${selectedStartTime} – ${selectedEndTime}`;
  }
}

function getDateContext(year, month, day) {
  const today = new Date();
  const cellDate = new Date(year, month, day);
  const isToday = cellDate.toDateString() === today.toDateString();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  return { isToday, nowMinutes };
}

function updateCalendarNav() {
  const prevBtn = document.getElementById('prevMonth');
  if (!prevBtn) return;
  const today = new Date();
  const canPrev = currentYear > today.getFullYear()
    || (currentYear === today.getFullYear() && currentMonth > today.getMonth());
  prevBtn.disabled = !canPrev;
  prevBtn.classList.toggle('disabled', !canPrev);
  prevBtn.title = canPrev ? 'Previous month' : 'Past months are not available';
}

function buildCalendar(year, month) {
  const today = new Date();
  if (typeof DentalSync !== 'undefined' && DentalSync.isPastCalendarMonth(year, month)) {
    year = today.getFullYear();
    month = today.getMonth();
    currentYear = year;
    currentMonth = month;
  }

  calendarDays.innerHTML = '';

  monthLabel.textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let selectedDay = null;
  if (selectedDate) {
    const sel = new Date(selectedDate);
    if (sel.getFullYear() === year && sel.getMonth() === month) {
      selectedDay = sel.getDate();
    }
  }

  const totalCells = CALENDAR_ROWS * CALENDAR_COLS;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;

    if (dayNum < 1 || dayNum > daysInMonth) {
      const blank = document.createElement('div');
      blank.className = 'cal-spacer';
      blank.setAttribute('aria-hidden', 'true');
      calendarDays.appendChild(blank);
      continue;
    }

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'date-cell';
    cell.textContent = dayNum;
    cell.dataset.day = String(dayNum);

    const cellDate = new Date(year, month, dayNum);
    const isToday = cellDate.toDateString() === today.toDateString();
    const isPast = cellDate < todayStart;
    const isSunday = cellDate.getDay() === 0;

    if (isToday) cell.classList.add('today');
    if (selectedDay === dayNum) cell.classList.add('selected');

    if (isPast || isSunday) {
      cell.classList.add('disabled');
      cell.disabled = true;
      cell.title = isPast ? 'Past date' : 'Clinic closed on Sundays';
    } else {
      applyAvailabilityClass(cell, year, month, dayNum);
      cell.addEventListener('click', () => selectCalendarDay(cell, year, month, dayNum));
    }

    calendarDays.appendChild(cell);
  }

  if (selectedDate && typeof DentalSync !== 'undefined' && DentalSync.isPastDateValue(getActiveDateISO() || selectedDate)) {
    selectedDate = null;
    selectedDateISO = null;
    selectedTime = null;
    selectedStartTime = null;
    selectedEndTime = null;
    if (dateLabel) dateLabel.textContent = 'Select a date';
  }

  updateCalendarNav();
}

function applyAvailabilityClass(cell, year, month, day) {
  cell.classList.remove('has-available', 'unavailable');
  const availableCount = countAvailableSlots(year, month, day);
  if (availableCount > 0) {
    cell.classList.add('has-available');
    cell.disabled = false;
    cell.title = `${availableCount} available slot${availableCount > 1 ? 's' : ''}`;
  } else {
    cell.classList.add('unavailable');
    cell.disabled = true;
    cell.title = 'No slots available for selected service duration';
  }
}

function selectCalendarDay(cell, year, month, day) {
  if (cell.disabled || cell.classList.contains('disabled') || cell.classList.contains('unavailable')) return;

  calendarDays.querySelectorAll('.date-cell').forEach(c => c.classList.remove('selected'));
  cell.classList.add('selected');
  selectedDate = `${months[month].slice(0, 3)} ${day}, ${year}`;
  selectedDateISO = DentalSync.toISODateString(new Date(year, month, day));
  selectedTime = null;
  selectedStartTime = null;
  selectedEndTime = null;
  dateLabel.textContent = selectedDate;
  renderSlots();
  updateSummary();
}

function updateCalendarAvailability() {
  calendarDays.querySelectorAll('.date-cell').forEach(cell => {
    if (cell.classList.contains('disabled')) return;
    const day = parseInt(cell.dataset.day, 10);
    applyAvailabilityClass(cell, currentYear, currentMonth, day);
  });
}

function renderSlots() {
  const placeholder = document.getElementById('slotsPlaceholder');
  const list = document.getElementById('slotsList');

  if (!selectedDate) {
    placeholder.classList.remove('hidden');
    list.classList.add('hidden');
    placeholder.textContent = '📆 Please select a date on the calendar';
    return;
  }

  const selDateObj = new Date(selectedDate);
  const today = new Date();
  const isSelectedToday = selDateObj.toDateString() === today.toDateString();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  list.innerHTML = '';
  const duration = readDurationFromUI();

  const durationHint = document.getElementById('slotsDurationHint');
  if (durationHint) {
    durationHint.textContent = `${selectedService} · ${duration} min per slot`;
  }

  const bookedRanges = selectedDentist ? getBookedRangesForDateStr(getActiveDateISO()) : [];
  bookedRanges.forEach(range => {
    const block = document.createElement('div');
    block.className = 'slot-booked-block';
    block.setAttribute('role', 'note');
    const label = DentalSync.formatMinutesRange(range.start, range.end);
    const badgeLabel = range.isDisabled ? (range.service || 'Blocked Out') : 'Booked';
    block.innerHTML = `<span class="slot-booked-label" style="${range.isDisabled ? 'background:#64748b;color:#fff;' : ''}">${badgeLabel}</span><span>${label}</span>`;
    block.title = `${label} is not available`;
    list.appendChild(block);
  });

  const availableTimes = getAvailableStartTimes(
    duration,
    selectedDate,
    isSelectedToday,
    nowMinutes
  );

  const availableCount = availableTimes.length;

  availableTimes.forEach(time => {
    const slotMinutes = parseTimeToMinutes(time);
    const displayEnd = minutesToTimeStr(slotMinutes + duration);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = `${time} – ${displayEnd}`;
    btn.title = `Available · ${duration} min`;

    if (selectedStartTime === time) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      list.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStartTime = time;
      selectedEndTime = displayEnd;
      selectedTime = `${selectedStartTime} – ${selectedEndTime}`;
      updateSummary();
    });

    list.appendChild(btn);
  });

  if (!selectedDentist) {
    placeholder.classList.remove('hidden');
    list.classList.remove('hidden');
    placeholder.textContent = 'Choose a dentist to check which times are already booked.';
    placeholder.classList.add('slots-hint');
    return;
  }

  placeholder.classList.remove('slots-hint');

  if (availableCount === 0) {
    placeholder.classList.remove('hidden');
    list.classList.remove('hidden');
    placeholder.textContent = `No open slots for a ${duration}-minute ${selectedService} on this date. Try another date or a shorter service.`;
    return;
  }

  placeholder.classList.add('hidden');
  list.classList.remove('hidden');
}

function refreshAvailability() {
  validateSelectedSlot();
  updateCalendarAvailability();
  if (selectedDate) renderSlots();
  updateSummary();
}

document.getElementById('prevMonth').addEventListener('click', () => {
  const today = new Date();
  const nextMonth = currentMonth - 1;
  const nextYear = nextMonth < 0 ? currentYear - 1 : currentYear;
  const normalizedMonth = nextMonth < 0 ? 11 : nextMonth;
  if (nextYear < today.getFullYear()
    || (nextYear === today.getFullYear() && normalizedMonth < today.getMonth())) {
    return;
  }
  currentMonth = normalizedMonth;
  currentYear = nextYear;
  buildCalendar(currentYear, currentMonth);
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  buildCalendar(currentYear, currentMonth);
});

function renderClinics() {
  clinicListEl.innerHTML = '';
  clinics.forEach(clinic => {
    const item = document.createElement('div');
    item.className = 'clinic-item';
    item.innerHTML = `
      <div class="clinic-avatar ${clinic.avatarClass}">${clinic.avatar}</div>
      <div>
        <p class="clinic-name">${clinic.name}</p>
        <p class="clinic-address">📍 ${clinic.address}</p>
      </div>
      <span class="checkmark">›</span>
    `;
    item.addEventListener('click', () => selectClinic(clinic));
    clinicListEl.appendChild(item);
  });
}

function renderDentists(clinic) {
  dentistListEl.innerHTML = '';
  selectedClinicLabelEl.textContent = `${clinic.name} · ${clinic.address}`;

  const dentists = typeof DentalSync !== 'undefined'
    ? DentalSync.getAvailableDentists(clinic.id)
    : clinic.dentists;

  if (!dentists.length) {
    dentistListEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No dentists available for this clinic.</p>';
    return;
  }

  let activeIndex = -1;
  if (selectedDentist) {
    const idx = dentists.findIndex(d => d.name === selectedDentist);
    if (idx >= 0) activeIndex = idx;
  }
  if (activeIndex < 0) {
    activeIndex = dentists.findIndex(d => d.available !== false);
    if (activeIndex < 0) activeIndex = 0;
  }

  dentists.forEach((dentist, index) => {
    const isAvailable = dentist.available !== false;
    const item = document.createElement('div');
    item.className = 'dentist-item' + (isAvailable ? '' : ' dentist-unavailable');
    item.dataset.dentist = dentist.name;
    const statusClass = isAvailable ? 'completed' : 'warning';
    const statusLabel = isAvailable ? 'Available' : 'Unavailable';
    const youLabel = dentist.isAccountUser ? ' · Your clinic' : '';
    item.innerHTML = `
      <div class="dentist-avatar ${dentist.avatarClass || ''}">${dentist.avatar}</div>
      <div style="flex:1;">
        <p class="dentist-name">${dentist.name}</p>
        <p class="dentist-role">${dentist.specialty}${youLabel}</p>
        <span class="status-pill ${statusClass}" style="margin-top:6px;display:inline-block;font-size:0.75rem;">${statusLabel}</span>
      </div>
      <span class="checkmark">${index === activeIndex && isAvailable ? '✓' : '○'}</span>
    `;
    if (index === activeIndex && isAvailable) item.classList.add('selected');
    item.addEventListener('click', () => {
      if (!isAvailable) {
        showToast(`${dentist.name} is currently unavailable for booking.`, 'warn');
        return;
      }
      dentistListEl.querySelectorAll('.dentist-item').forEach(i => {
        i.classList.remove('selected');
        i.querySelector('.checkmark').textContent = '○';
      });
      item.classList.add('selected');
      item.querySelector('.checkmark').textContent = '✓';
      selectedDentist = dentist.name;
      refreshAvailability();
      updateSummary();
    });
    dentistListEl.appendChild(item);
  });

  const active = dentists[activeIndex];
  selectedDentist = active && active.available !== false ? active.name : null;
  refreshAvailability();
  updateSummary();
}

function selectClinic(clinic) {
  selectedClinic = clinic;
  selectedDentist = null;
  clinicStepEl.classList.add('hidden');
  dentistStepEl.classList.remove('hidden');
  renderDentists(clinic);
  refreshAvailability();
  updateSummary();
}

function backToClinics() {
  selectedClinic = null;
  selectedDentist = null;
  dentistStepEl.classList.add('hidden');
  clinicStepEl.classList.remove('hidden');
  updateSummary();
}

document.getElementById('backToClinics').addEventListener('click', backToClinics);

document.querySelectorAll('#serviceChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#serviceChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedService = chip.dataset.service;
    selectedDuration = chip.dataset.dur;
    selectedDurationMinutes = parseDurationToMinutes(selectedDuration);
    if (chip.dataset.minutes) {
      selectedDurationMinutes = parseInt(chip.dataset.minutes, 10) || selectedDurationMinutes;
    }
    updateSummary();
    updateConsultationNotesVisibility();
    refreshAvailability();
  });
});

document.getElementById('confirmBookingBtn').addEventListener('click', () => {
  if (!selectedClinic) {
    showToast('Please choose a clinic first.', 'warn');
    return;
  }
  if (!selectedDentist) {
    showToast('Please choose an available dentist at your selected clinic.', 'warn');
    return;
  }

  const dentistOptions = DentalSync.getAvailableDentists(selectedClinic.id);
  const chosen = dentistOptions.find(d => d.name === selectedDentist);
  if (chosen && chosen.available === false) {
    showToast(`${selectedDentist} is currently unavailable. Please choose another dentist.`, 'warn');
    return;
  }

  if (!getActiveDateISO() || !selectedTime) {
    showToast('Please select a date and time slot.', 'warn');
    return;
  }

  if (DentalSync.isPastDateValue(getActiveDateISO())) {
    showToast('Past dates cannot be booked.', 'warn');
    return;
  }

  const selDateObj = new Date(getActiveDateISO() + 'T12:00:00');
  const today = new Date();
  const isToday = selDateObj.toDateString() === today.toDateString();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const duration = readDurationFromUI();
  const slotStatus = getSlotStatus(parseTimeToMinutes(selectedStartTime), isToday, nowMinutes, duration);
  if (!slotStatus.ok) {
    showToast(slotStatus.reason || 'That slot is no longer available.', 'warn');
    refreshAvailability();
    return;
  }

  DentalSync.addAppointment({
    clinicId: selectedClinic.id,
    clinicName: selectedClinic.name,
    dentist: selectedDentist,
    service: selectedService,
    duration: selectedDuration,
    durationMinutes: selectedDurationMinutes,
    date: getActiveDateISO(),
    time: selectedTime,
    startMinutes: parseTimeToMinutes(selectedStartTime),
    endMinutes: parseTimeToMinutes(selectedStartTime) + selectedDurationMinutes,
    operatory: DentalSync.resolveOperatoryForAppointment({
      dentist: selectedDentist,
      clinicId: selectedClinic.id,
    }),
    additionalNotes: selectedService === 'Consultation' ? (consultationNotesInput?.value.trim() || '') : '',
  });

  if (consultationNotesInput) consultationNotesInput.value = '';

  selectedTime = null;
  selectedStartTime = null;
  selectedEndTime = null;
  refreshAvailability();
  renderMyAppointments();
  showToast(`✅ Booking sent to ${selectedClinic.name}. ${selectedDentist} will receive your appointment request.`, 'success');
});

function renderMyAppointments() {
  const list = document.getElementById('myAppointmentsList');
  const empty = document.getElementById('myAppointmentsEmpty');
  if (!list) return;

  list.querySelectorAll('.mini-item').forEach(el => el.remove());

  const bookings = DentalSync.getAppointments({ patientName: DentalSync.getPatientName() });
  if (bookings.length === 0) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  bookings.forEach(appt => {
    const displayDate = DentalSync.formatDisplayDate(appt.date) || appt.date;
    const dateObj = new Date(DentalSync.toISODateString(appt.date) + 'T12:00:00');
    const day = Number.isNaN(dateObj.getDate()) ? '—' : dateObj.getDate();
    const month = Number.isNaN(dateObj.getDate()) ? '—' : dateObj.toLocaleString('en', { month: 'short' }).toUpperCase();

    const item = document.createElement('div');
    item.className = 'mini-item';
    const statusNote = appt.status === 'pending' ? ' · Pending' : appt.status === 'in_progress' ? ' · In progress' : '';
    item.innerHTML = `
      <div class="mini-date">${day}<br/>${month}</div>
      <div class="mini-item-body">
        <p class="mini-name">${appt.service}${statusNote}</p>
        <p class="mini-meta">${appt.dentist} · ${DentalSync.extractStartTime(appt.time)}</p>
        <p class="mini-meta" style="font-size:0.8rem;">${appt.clinicName || ''}</p>
      </div>
      <button type="button" class="btn btn-danger btn-sm cancel-appt-btn" data-id="${appt.id}" title="Cancel this booking">Cancel</button>
    `;
    list.appendChild(item);
  });
}

function cancelBooking(id) {
  const bookings = DentalSync.getAppointments({ patientName: DentalSync.getPatientName() });
  const appt = bookings.find(a => a.id === id);
  if (!appt) return;

  const label = `${appt.service} on ${appt.date} at ${DentalSync.extractStartTime(appt.time)}`;
  if (!confirm(`Cancel your booking for ${label}?`)) return;

  DentalSync.removeAppointment(id);
  renderMyAppointments();
  refreshAvailability();
  showToast('Booking cancelled. That time slot is available again.', 'success');
}

const myAppointmentsList = document.getElementById('myAppointmentsList');
if (myAppointmentsList) {
  myAppointmentsList.addEventListener('click', e => {
    const btn = e.target.closest('.cancel-appt-btn');
    if (!btn?.dataset.id) return;
    cancelBooking(btn.dataset.id);
  });
}

DentalSync.onUpdate(() => {
  renderMyAppointments();
  refreshAvailability();
  if (selectedDateISO || selectedDate) renderSlots();
  updateSummary();
  if (selectedClinic && dentistStepEl && !dentistStepEl.classList.contains('hidden')) {
    renderDentists(selectedClinic);
  }
});

readDurationFromUI();
updateConsultationNotesVisibility();

renderClinics();
buildCalendar(currentYear, currentMonth);
renderMyAppointments();
updateSummary();
