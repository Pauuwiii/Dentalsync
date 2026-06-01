const menuButtons = document.querySelectorAll('.menu-item[data-view]');
const screens = document.querySelectorAll('.screen');
const quickCards = document.querySelectorAll('.quick-card');
const dateCells = document.querySelectorAll('.date-cell');
const slotsList = document.getElementById('slotsList');
const slotsPlaceholder = document.getElementById('slotsPlaceholder');
const toast = document.getElementById('toastMessage');
const confirmBookingBtn = document.getElementById('confirmBookingBtn');
const bookingSummary = {
  date: document.getElementById('bookingSummaryDate'),
  time: document.getElementById('bookingSummaryTime'),
  dentist: document.getElementById('bookingSummaryDentist'),
  service: document.getElementById('bookingSummaryService'),
  duration: document.getElementById('bookingSummaryDuration'),
};
const dentistItems = document.querySelectorAll('.dentist-item');
const serviceChips = document.querySelectorAll('.chip');
const typeChips = document.querySelectorAll('.type-chip');
const symptomChips = document.querySelectorAll('.symptom-chip');
const tabs = document.querySelectorAll('.tab');
const calendarNavButtons = document.querySelectorAll('.calendar-nav');

let selectedDate = 'Mar 11, 2026';
let selectedTime = null;
let selectedService = 'Cleaning';
let selectedDentist = 'Dr. Maria Santos';
let selectedDuration = '~60 min';

const slotOptions = [
  '8:00 AM',
  '9:00 AM',
  '10:30 AM',
  '1:00 PM',
  '2:30 PM',
];

const durationMap = {
  Cleaning: '~60 min',
  Extraction: '~60 min',
  Consultation: '~60 min',
};

function showScreen(viewId) {
  screens.forEach(screen => {
    screen.classList.toggle('hidden', screen.id !== viewId);
  });
}

function updateBookingSummary() {
  bookingSummary.date.textContent = selectedDate || 'Not selected';
  bookingSummary.time.textContent = selectedTime || 'Not selected';
  bookingSummary.dentist.textContent = selectedDentist;
  bookingSummary.service.textContent = selectedService;
  bookingSummary.duration.textContent = selectedDuration;
}

function renderAvailableSlots(dateLabel) {
  if (!dateLabel) {
    slotsList.classList.add('hidden');
    slotsPlaceholder.classList.remove('hidden');
    slotsPlaceholder.innerHTML = '<p>Please select a date above</p>';
    return;
  }

  slotsPlaceholder.classList.add('hidden');
  slotsList.classList.remove('hidden');
  slotsList.innerHTML = '';

  slotOptions.forEach(time => {
    const slotButton = document.createElement('button');
    slotButton.type = 'button';
    slotButton.className = 'slot-button';
    slotButton.textContent = time;
    slotButton.addEventListener('click', () => {
      selectedTime = time;
      document.querySelectorAll('.slot-button').forEach(btn => btn.classList.remove('active'));
      slotButton.classList.add('active');
      updateBookingSummary();
    });
    slotsList.appendChild(slotButton);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

menuButtons.forEach(button => {
  button.addEventListener('click', () => {
    menuButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const view = button.dataset.view;
    showScreen(view);
  });
});

quickCards.forEach(card => {
  card.addEventListener('click', () => {
    const text = card.textContent.trim();
    if (text.includes('Book Appointment')) {
      document.querySelector('.menu-item[data-view="appointments"]').click();
    } else if (text.includes('In-Clinic Consultation')) {
      document.querySelector('.menu-item[data-view="consultation"]').click();
    } else if (text.includes('Patient Records')) {
      document.querySelector('.menu-item[data-view="records"]').click();
    } else if (text.includes('Prescriptions')) {
      document.querySelector('.menu-item[data-view="notifications"]').click();
    }
  });
});

dateCells.forEach(cell => {
  cell.addEventListener('click', () => {
    document.querySelectorAll('.date-cell').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    selectedDate = `Mar ${cell.textContent}, 2026`;
    selectedTime = null;
    renderAvailableSlots(selectedDate);
    updateBookingSummary();
  });
});

calendarNavButtons.forEach(button => {
  button.addEventListener('click', () => {
    showToast('Month navigation is a demo preview.');
  });
});

serviceChips.forEach(chip => {
  chip.addEventListener('click', () => {
    serviceChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedService = chip.textContent.trim();
    selectedDuration = durationMap[selectedService] || '~60 min';
    updateBookingSummary();
  });
});

dentistItems.forEach(item => {
  item.addEventListener('click', () => {
    dentistItems.forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    selectedDentist = item.querySelector('.dentist-name').textContent;
    updateBookingSummary();
  });
});

typeChips.forEach(chip => {
  chip.addEventListener('click', () => {
    typeChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

symptomChips.forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('active');
  });
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

confirmBookingBtn.addEventListener('click', () => {
  if (!selectedDate || !selectedTime) {
    showToast('Select a date and time before confirming.');
    return;
  }
  showToast(`Booking confirmed for ${selectedDate} at ${selectedTime}.`);
});

updateBookingSummary();
renderAvailableSlots(null);
