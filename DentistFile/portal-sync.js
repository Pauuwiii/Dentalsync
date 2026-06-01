// portal-sync.js — Render patient bookings & messages on the dentist portal

function statusClass(status) {
  if (status === 'confirmed' || status === 'completed') return 'completed';
  if (status === 'in_progress') return 'warning';
  if (status === 'pending') return 'teal';
  if (status === 'cancelled') return 'warning';
  return 'teal';
}

function statusLabel(status) {
  if (!status || status === 'pending') return 'Pending';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function sortAppointments(list) {
  return list.slice().sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    if (dateA !== dateB) return dateA - dateB;
    const startA = typeof a.startMinutes === 'number' ? a.startMinutes : DentalSync.parseTimeToMinutes(DentalSync.extractStartTime(a.time));
    const startB = typeof b.startMinutes === 'number' ? b.startMinutes : DentalSync.parseTimeToMinutes(DentalSync.extractStartTime(b.time));
    return startA - startB;
  });
}

function renderAppointmentActions(appt) {
  const id = appt.id;
  const status = appt.status || 'pending';
  const buttons = [];

  if (status === 'pending') {
    buttons.push(`<button class="btn btn-warning btn-sm status-inprogress-btn" data-id="${id}" type="button">In Progress</button>`);
  } else if (status === 'in_progress') {
    buttons.push(`<button class="btn btn-secondary btn-sm status-pending-btn" data-id="${id}" type="button">Pending</button>`);
    buttons.push(`<button class="btn btn-primary btn-sm confirm-appt-btn" data-id="${id}" type="button">Confirm</button>`);
  } else if (DentalSync.isFinishedAppointment(status)) {
    buttons.push(`<button class="btn btn-outline btn-sm remove-appt-btn" data-id="${id}" type="button">Remove</button>`);
  }

  return buttons.length
    ? `<div class="queue-action-group">${buttons.join('')}</div>`
    : '<span style="color:var(--text-muted);font-size:0.85rem;">—</span>';
}

function getPortalBookings() {
  return sortAppointments(DentalSync.getAppointments({ clinicPortal: true, onlineOnly: true }));
}

function renderPortalUI() {
  DentalSync.ensurePortalClinic();
  const profile = DentalSync.getClinicProfile();
  const clinicName = profile.clinic || DentalSync.getPortalClinicName();
  const dentistName = DentalSync.getDentistName();
  const initial = (clinicName.replace(/Dental Clinic/i, '').trim()[0] || 'L').toUpperCase();

  document.querySelectorAll('.sidebar-profile .avatar').forEach(el => {
    el.textContent = initial;
  });
  document.querySelectorAll('.sidebar-profile .profile-name').forEach(el => {
    el.textContent = clinicName;
  });
  document.querySelectorAll('.sidebar-profile .profile-role').forEach(el => {
    el.textContent = 'Dental Clinic';
  });
  document.querySelectorAll('.topbar .avatar-btn').forEach(el => {
    el.textContent = initial;
  });
  document.querySelectorAll('.hero-eyebrow').forEach(el => {
    el.textContent = `Good day, ${dentistName}`;
  });
  document.querySelectorAll('.hero-card h1').forEach(el => {
    if (el.textContent.includes('Dashboard')) el.textContent = 'Doctor Dashboard';
  });
}

function renderDashboardStats() {
  const bookings = getPortalBookings();
  const today = DentalSync.getTodayISO();
  const todayBookings = bookings.filter(a => DentalSync.normalizeDateKey(a.date) === today);
  const pending = bookings.filter(a => {
    const s = a.status || 'pending';
    return s === 'pending' || s === 'in_progress';
  });
  const unread = DentalSync.getMessages({ clinicPortal: true, unread: true }).length;
  const patients = DentalSync.load().clinicPatients.length;

  const statValues = document.querySelectorAll('.stats-grid .stat-value');
  if (statValues[0]) statValues[0].textContent = String(todayBookings.length);
  if (statValues[1]) statValues[1].textContent = String(patients || bookings.length);
  if (statValues[3]) statValues[3].textContent = String(unread);

  const statNotes = document.querySelectorAll('.stats-grid .stat-note');
  if (statNotes[0]) statNotes[0].textContent = pending.length ? `${pending.length} awaiting action` : 'None pending';

  const subtitle = document.querySelector('.hero-card .subtitle');
  if (subtitle) {
    const next = pending[0] || todayBookings[0];
    if (next) {
      subtitle.innerHTML = `Today’s schedule: <strong>${todayBookings.length} patient visit${todayBookings.length === 1 ? '' : 's'}</strong> · Next: <strong>${DentalSync.extractStartTime(next.time)} with ${next.patientName}</strong>`;
    } else {
      subtitle.innerHTML = `Today’s schedule: <strong>${todayBookings.length} patient visit${todayBookings.length === 1 ? '' : 's'}</strong> · No pending online bookings`;
    }
  }

  const upcomingCard = document.querySelector('.dashboard-bottom .card');
  if (upcomingCard && upcomingCard.querySelector('h2')?.textContent === 'Upcoming Visits') {
    const recent = pending.slice(0, 2);
    upcomingCard.querySelectorAll('.appt-card').forEach(el => el.remove());
    const existingEmpty = upcomingCard.querySelector('.dashboard-empty-note');
    if (existingEmpty) existingEmpty.remove();

    if (recent.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'dashboard-empty-note';
      empty.style.cssText = 'color:var(--text-muted);font-size:0.9rem;padding:8px 0;';
      empty.textContent = 'No pending online bookings right now.';
      upcomingCard.appendChild(empty);
    } else {
      recent.forEach(appt => {
        const dateObj = new Date(appt.date);
        const day = Number.isNaN(dateObj.getDate()) ? '—' : dateObj.getDate();
        const month = Number.isNaN(dateObj.getDate()) ? '—' : dateObj.toLocaleString('en', { month: 'short' }).toUpperCase();
        const card = document.createElement('div');
        card.className = 'appt-card';
        card.innerHTML = `
          <div class="appt-date">
            <span class="day">${day}</span>
            <span class="month">${month}</span>
          </div>
          <div>
            <p class="appt-title">${appt.patientName}</p>
            <p class="appt-meta">${appt.service} · ${DentalSync.extractStartTime(appt.time)} · ${appt.dentist || '—'}</p>
          </div>
        `;
        upcomingCard.appendChild(card);
      });
    }
  }
}

function renderAppointmentQueue() {
  const tbody = document.getElementById('appointmentQueueBody');
  const countEl = document.getElementById('appointmentQueueCount');
  if (!tbody) return;

  tbody.innerHTML = '';

  const bookings = getPortalBookings();
  const pending = bookings.filter(a => (a.status || 'pending') === 'pending');
  const inProgress = bookings.filter(a => a.status === 'in_progress');

  bookings.forEach(appt => {
    const row = document.createElement('tr');
    row.className = 'sync-row';
    row.dataset.id = appt.id;
    const notes = appt.additionalNotes || '—';
    row.innerHTML = `
      <td>${DentalSync.formatBookingDate(appt.date)}</td>
      <td>${DentalSync.extractStartTime(appt.time)}</td>
      <td>${appt.patientName}</td>
      <td>${appt.service}</td>
      <td style="color:var(--text-muted);max-width:220px;">${notes}</td>
      <td>${appt.dentist || '—'}</td>
      <td>${appt.clinicName || '—'}</td>
      <td><span class="status-pill ${statusClass(appt.status)}">${statusLabel(appt.status)}</span></td>
      <td class="queue-actions">${renderAppointmentActions(appt)}</td>
    `;
    tbody.appendChild(row);
  });

  if (bookings.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'queue-empty-row';
    emptyRow.innerHTML = `<td colspan="9" style="text-align:center;color:var(--text-muted);padding:28px;">No patient bookings yet. New appointments from the patient portal will appear here.</td>`;
    tbody.appendChild(emptyRow);
  }

  if (countEl) {
    const confirmed = bookings.filter(a => DentalSync.isFinishedAppointment(a.status)).length;
    const awaiting = pending.length + inProgress.length;
    if (awaiting === 0 && confirmed === 0) {
      countEl.textContent = 'No pending bookings';
    } else if (awaiting === 0) {
      countEl.textContent = `${confirmed} completed booking${confirmed === 1 ? '' : 's'} · none awaiting action`;
    } else {
      const parts = [];
      if (pending.length) parts.push(`${pending.length} pending`);
      if (inProgress.length) parts.push(`${inProgress.length} in progress`);
      countEl.textContent = `${parts.join(' · ')} · ${bookings.length} total`;
    }
  }

  updateSidebarBadges();
}

function removeFinishedAppointments() {
  const finished = getPortalBookings().filter(a => DentalSync.isFinishedAppointment(a.status));
  if (finished.length === 0) {
    showToast('No completed bookings to clear.', 'warn');
    return;
  }
  if (!confirm(`Remove ${finished.length} confirmed booking${finished.length === 1 ? '' : 's'} from this list?`)) return;
  finished.forEach(a => DentalSync.removeAppointment(a.id));
  showToast(`Removed ${finished.length} confirmed booking${finished.length === 1 ? '' : 's'}.`, 'success');
  renderAppointmentQueue();
  renderAppointmentHighlights();
}

function renderPatientMessages() {
  const list = document.getElementById('patientMessagesList');
  const empty = document.getElementById('patientMessagesEmpty');
  if (!list) return;

  list.innerHTML = '';
  const threads = DentalSync.getMessageThreads({ clinicPortal: true, viewerSide: 'dentist' });

  if (threads.length === 0) {
    if (empty) empty.classList.remove('hidden');
    updateSidebarBadges();
    return;
  }

  if (empty) empty.classList.add('hidden');

  threads.forEach(thread => {
    const root = thread.root;
    const icon = root.type === 'appointment' ? '📅' : root.type === 'consultation' ? '🩺' : '💬';
    const item = document.createElement('div');
    item.className = `message-thread card${thread.unread ? ' unread-thread' : ''}`;
    item.style.cssText = 'padding:16px;margin-bottom:14px;';
    item.dataset.threadId = thread.threadId;

    const messagesHtml = thread.messages.map(msg => {
      const who = msg.from === 'dentist' ? (msg.dentist || 'Clinic') : msg.patientName;
      return `<div class="thread-msg ${msg.from === 'dentist' ? 'from-dentist' : 'from-patient'}">
        <p class="thread-msg-meta">${who} · ${DentalSync.formatTimeLabel(msg.createdAt)}</p>
        <p class="notif-text">${msg.body}</p>
      </div>`;
    }).join('');

    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="display:flex;gap:12px;flex:1;">
          <div class="notif-icon teal">${icon}</div>
          <div style="flex:1;">
            <p class="notif-text"><strong>${root.subject}</strong></p>
            <p class="notif-time">${root.patientName}${thread.unread ? ' · Unread' : ''}</p>
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm remove-thread-btn" data-thread-id="${thread.threadId}">Remove</button>
      </div>
      <div class="thread-messages">${messagesHtml}</div>
      <div class="thread-reply" style="margin-top:12px;display:flex;gap:8px;">
        <input type="text" class="thread-reply-input" placeholder="Reply to ${root.patientName}…" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--surface-border);background:var(--surface);color:var(--text);" />
        <button type="button" class="btn btn-primary btn-sm thread-reply-btn">Reply</button>
      </div>
    `;

    item.querySelector('.remove-thread-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`Remove conversation with ${root.patientName}?`)) return;
      DentalSync.removeMessageThread(thread.threadId);
      renderPatientMessages();
      showToast('Conversation removed.', 'success');
    });

    item.querySelector('.thread-reply-btn').addEventListener('click', () => {
      const input = item.querySelector('.thread-reply-input');
      const body = input.value.trim();
      if (!body) return;
      DentalSync.addReply(thread.threadId, body, 'dentist');
      input.value = '';
      renderPatientMessages();
      showToast('Reply sent to patient.', 'success');
    });

    item.addEventListener('click', e => {
      if (e.target.closest('.thread-reply') || e.target.closest('.remove-thread-btn')) return;
      thread.messages.filter(m => m.from === 'patient').forEach(m => DentalSync.markMessageRead(m.id));
      updateSidebarBadges();
    });

    list.appendChild(item);
  });

  updateSidebarBadges();
}

function renderAppointmentHighlights() {
  const highlights = document.getElementById('appointmentHighlights');
  if (!highlights) return;

  highlights.innerHTML = '';
  const recent = getPortalBookings()
    .filter(a => {
      const s = a.status || 'pending';
      return s === 'pending' || s === 'in_progress';
    })
    .slice(0, 5);

  if (recent.length === 0) {
    highlights.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No pending online bookings right now.</p>';
    return;
  }

  recent.forEach(appt => {
    const item = document.createElement('div');
    item.className = 'hist-item sync-highlight';
    const note = appt.additionalNotes ? ` · ${appt.additionalNotes}` : '';
    item.innerHTML = `
      <p class="hist-title">${appt.patientName} — ${appt.service}</p>
      <p class="hist-meta">${DentalSync.formatBookingDate(appt.date)} at ${DentalSync.extractStartTime(appt.time)}${note}</p>
    `;
    highlights.appendChild(item);
  });
}

function updateSidebarBadges() {
  const unread = DentalSync.getMessages({ clinicPortal: true, unread: true }).length;
  const pending = getPortalBookings().filter(a => {
    const s = a.status || 'pending';
    return s === 'pending' || s === 'in_progress';
  }).length;

  document.querySelectorAll('a[href="notifications.html"] .badge').forEach(badge => {
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  });

  document.querySelectorAll('a[href="appointments.html"] .badge').forEach(badge => {
    if (pending > 0) {
      badge.textContent = pending;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  });
}

function populateComposePatientSelect() {
  const select = document.getElementById('composePatient');
  if (!select) return;
  DentalSync.ensureDefaultPatients();
  const previous = select.value;
  const names = DentalSync.getAllPatientNames();
  select.innerHTML = '';
  if (names.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No patients in list yet';
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
    return;
  }
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  if (previous && names.includes(previous)) select.value = previous;
}

function bindMessageCompose() {
  const form = document.getElementById('dentistComposeForm');
  if (!form) return;

  populateComposePatientSelect();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const patientName = document.getElementById('composePatient')?.value;
    const body = document.getElementById('composePatientText')?.value.trim();
    if (!patientName) {
      showToast('Please choose a patient.', 'warn');
      return;
    }
    if (!body) {
      showToast('Please write a message.', 'warn');
      return;
    }

    const dentist = DentalSync.getDentistName();
    const clinic = DentalSync.getPortalClinic();
    DentalSync.addMessage({
      type: 'message',
      from: 'dentist',
      patientName,
      dentist,
      clinicId: clinic?.id || DentalSync.getPortalClinicId(),
      clinicName: clinic?.name || DentalSync.getPortalClinicName(),
      subject: `Message from ${clinic?.name || 'your clinic'}`,
      body,
    });

    form.reset();
    populateComposePatientSelect();
    renderPatientMessages();
    showToast(`Message sent to ${patientName}.`, 'success');
  });
}

function bindAppointmentActions() {
  document.addEventListener('click', (e) => {
    const pendingBtn = e.target.closest('.status-pending-btn');
    if (pendingBtn) {
      DentalSync.updateAppointmentStatus(pendingBtn.dataset.id, 'pending');
      showToast('Booking set to Pending.', 'success');
      renderAppointmentQueue();
      renderAppointmentHighlights();
      return;
    }

    const inProgressBtn = e.target.closest('.status-inprogress-btn');
    if (inProgressBtn) {
      DentalSync.updateAppointmentStatus(inProgressBtn.dataset.id, 'in_progress');
      showToast('Booking set to In Progress.', 'success');
      renderAppointmentQueue();
      renderAppointmentHighlights();
      return;
    }

    const confirmBtn = e.target.closest('.confirm-appt-btn');
    if (confirmBtn) {
      const appt = DentalSync.getAppointments().find(a => a.id === confirmBtn.dataset.id);
      if (!appt || appt.status !== 'in_progress') {
        showToast('Set the booking to In Progress before confirming completion.', 'warn');
        return;
      }
      const defaultNotes = appt.additionalNotes || '';
      const notes = prompt('Add notes for the patient record (optional):', defaultNotes) || '';
      DentalSync.confirmAppointment(confirmBtn.dataset.id, notes.trim());
      showToast('Visit confirmed. Patient record updated with last visit.', 'success');
      renderAppointmentQueue();
      renderAppointmentHighlights();
      renderPatientMessages();
      return;
    }

    const removeBtn = e.target.closest('.remove-appt-btn');
    if (removeBtn) {
      const row = removeBtn.closest('tr');
      const patient = row?.children[2]?.textContent?.trim() || 'this booking';
      if (!confirm(`Remove completed booking for ${patient} from this list?`)) return;
      DentalSync.removeAppointment(removeBtn.dataset.id);
      showToast('Booking removed from list.', 'success');
      renderAppointmentQueue();
      renderAppointmentHighlights();
    }
  });

  const refreshBtn = document.querySelector('[data-action="refresh"]');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      renderAppointmentQueue();
      renderPatientMessages();
      renderAppointmentHighlights();
      showToast('Booking list refreshed.');
    });
  }

  const clearFinishedBtn = document.getElementById('clearFinishedBtn');
  if (clearFinishedBtn) {
    clearFinishedBtn.addEventListener('click', removeFinishedAppointments);
  }

  const markAllBtn = document.getElementById('markAllRead');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      DentalSync.markAllMessagesRead('clinicPortal');
      renderPatientMessages();
      showToast('All patient messages marked as read.', 'success');
    });
  }

  const clearAllBtn = document.getElementById('clearAllMessages');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const count = DentalSync.removeAllMessages({ clinicPortal: true });
      if (!count) {
        showToast('No messages to clear.', 'warn');
        return;
      }
      renderPatientMessages();
      updateSidebarBadges();
      showToast(`Removed ${count} message${count === 1 ? '' : 's'}.`, 'success');
    });
  }
}

function initDentistPortalSync() {
  DentalSync.ensurePortalClinic();
  renderPortalUI();
  renderAppointmentQueue();
  renderPatientMessages();
  renderAppointmentHighlights();
  renderDashboardStats();
  updateSidebarBadges();
  bindMessageCompose();
  bindAppointmentActions();
  DentalSync.onUpdate(() => {
    renderPortalUI();
    renderAppointmentQueue();
    renderPatientMessages();
    renderAppointmentHighlights();
    renderDashboardStats();
    updateSidebarBadges();
    populateComposePatientSelect();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDentistPortalSync);
} else {
  initDentistPortalSync();
}
