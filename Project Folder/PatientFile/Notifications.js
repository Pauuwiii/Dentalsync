// notifications.js — Clinic messaging with replies + synced notifications

const threadsList = document.getElementById('messageThreadsList');
const threadsEmpty = document.getElementById('messageThreadsEmpty');
const syncNotifsList = document.getElementById('syncNotificationsList');
const clinicSelect = document.getElementById('messageClinic');
const patientComposeForm = document.getElementById('patientComposeForm');

function populateClinicSelect() {
  if (!clinicSelect || typeof DentalSync === 'undefined') return;
  const previous = clinicSelect.value;
  clinicSelect.innerHTML = '';
  DentalSync.CLINICS.forEach(clinic => {
    const option = document.createElement('option');
    option.value = clinic.id;
    option.textContent = `${clinic.dentist} · ${clinic.name}`;
    clinicSelect.appendChild(option);
  });
  if (previous) clinicSelect.value = previous;
}

if (patientComposeForm) {
  populateClinicSelect();
  patientComposeForm.addEventListener('submit', e => {
    e.preventDefault();
    const clinicId = clinicSelect?.value;
    const body = document.getElementById('messageText')?.value.trim();
    if (!clinicId) {
      showToast('Please choose a dentist.', 'warn');
      return;
    }
    if (!body) {
      showToast('Please write a message.', 'warn');
      return;
    }

    const clinic = DentalSync.getClinicById(clinicId);
    DentalSync.addMessage({
      type: 'message',
      from: 'patient',
      clinicId: clinic.id,
      clinicName: clinic.name,
      dentist: clinic.dentist,
      subject: `Message for ${clinic.dentist}`,
      body,
    });

    patientComposeForm.reset();
    populateClinicSelect();
    renderMessageThreads();
    showToast(`Message sent to ${clinic.dentist}.`, 'success');
  });
}

function renderMessageThreads() {
  if (!threadsList) return;
  const patientName = DentalSync.getPatientName();
  const threads = DentalSync.getMessageThreads({ patientName, viewerSide: 'patient' });

  threadsList.innerHTML = '';
  if (threads.length === 0) {
    if (threadsEmpty) threadsEmpty.classList.remove('hidden');
    return;
  }
  if (threadsEmpty) threadsEmpty.classList.add('hidden');

  threads.forEach(thread => {
    const root = thread.root;
    const icon = root.type === 'appointment' ? '📅' : '💬';
    const card = document.createElement('div');
    card.className = `message-thread card${thread.unread ? ' unread-thread' : ''}`;
    card.style.cssText = 'padding:16px;margin-bottom:14px;';

    const messagesHtml = thread.messages.map(msg => {
      const who = msg.from === 'dentist' ? (msg.dentist || 'Clinic') : 'You';
      return `<div class="thread-msg ${msg.from === 'dentist' ? 'from-dentist' : 'from-patient'}">
        <p class="thread-msg-meta">${who} · ${DentalSync.formatTimeLabel(msg.createdAt)}</p>
        <p class="notif-text">${msg.body}</p>
      </div>`;
    }).join('');

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="display:flex;gap:12px;flex:1;">
          <div class="notif-icon teal">${icon}</div>
          <div style="flex:1;">
            <p class="notif-text"><strong>${root.subject}</strong></p>
            <p class="notif-time">${root.clinicName || root.dentist || 'Clinic'}${thread.unread ? ' · Unread' : ''}</p>
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm remove-thread-btn" data-thread-id="${thread.threadId}">Remove</button>
      </div>
      <div class="thread-messages">${messagesHtml}</div>
      <div class="thread-reply" style="margin-top:12px;display:flex;gap:8px;">
        <input type="text" class="thread-reply-input" placeholder="Write a reply…" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--surface-border);background:var(--surface);color:var(--text);" />
        <button type="button" class="btn btn-primary btn-sm thread-reply-btn">Reply</button>
      </div>
    `;

    card.querySelector('.remove-thread-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Remove this conversation?')) return;
      DentalSync.removeMessageThread(thread.threadId);
      renderMessageThreads();
      showToast('Conversation removed.', 'success');
    });

    card.querySelector('.thread-reply-btn').addEventListener('click', () => {
      const input = card.querySelector('.thread-reply-input');
      const body = input.value.trim();
      if (!body) return;
      DentalSync.addReply(thread.threadId, body, 'patient');
      input.value = '';
      renderMessageThreads();
      showToast('Reply sent.', 'success');
    });

    card.addEventListener('click', e => {
      if (e.target.closest('.thread-reply') || e.target.closest('.remove-thread-btn')) return;
      thread.messages.filter(m => m.from === 'dentist').forEach(m => DentalSync.markMessageRead(m.id));
      renderMessageThreads();
    });

    threadsList.appendChild(card);
  });
}

function renderSyncNotifications() {
  if (!syncNotifsList) return;
  const records = DentalSync.getPatientRecords(DentalSync.getPatientName()).slice(0, 5);
  syncNotifsList.innerHTML = '';

  if (!records.length) {
    syncNotifsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Confirmed visits will appear in your patient records.</p>';
    return;
  }

  records.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'hist-item';
    const dentist = rec.dentist || 'Attending dentist not recorded';
    const clinic = rec.clinicName ? ` · ${rec.clinicName}` : '';
    item.innerHTML = `
      <p class="hist-title">${DentalSync.formatBookingDate(rec.date)}</p>
      <p class="hist-meta">${rec.procedure}: ${rec.notes || 'Visit completed'}</p>
      <p class="hist-meta" style="margin-top:6px;color:var(--primary);">Attending dentist: ${dentist}${clinic}</p>
    `;
    syncNotifsList.appendChild(item);
  });
}

const markAllReadBtn = document.getElementById('markAllRead');
if (markAllReadBtn) {
  markAllReadBtn.addEventListener('click', () => {
    const patientName = DentalSync.getPatientName();
    DentalSync.getMessages({ patientName }).forEach(m => {
      if (m.from === 'dentist') DentalSync.markMessageRead(m.id);
    });
    renderMessageThreads();
    showToast('All messages marked as read.', 'success');
  });
}

const clearAllMessagesBtn = document.getElementById('clearAllMessages');
if (clearAllMessagesBtn) {
  clearAllMessagesBtn.addEventListener('click', () => {
    const patientName = DentalSync.getPatientName();
    const count = DentalSync.removeAllMessages({ patientName });
    if (!count) {
      showToast('No messages to clear.', 'warn');
      return;
    }
    renderMessageThreads();
    showToast(`Removed ${count} message${count === 1 ? '' : 's'}.`, 'success');
  });
}

renderMessageThreads();
renderSyncNotifications();
if (typeof DentalSync !== 'undefined') {
  DentalSync.onUpdate(() => {
    populateClinicSelect();
    renderMessageThreads();
    renderSyncNotifications();
  });
}
