(function (global) {
  const STORAGE_KEY = 'dentalSyncData';
  const UPDATE_EVENT = 'dental-sync-update';

  const CLINICS = [
    { id: 'brual-putok', name: 'Brual Dental Clinic', dentist: 'Dr. Rosita A. Brual' },
    { id: 'brual-ortho', name: 'Brual Orthodontics Center', dentist: 'Dr. Marissa Brual' },
    { id: 'lacsamana', name: 'Lacsamana Dental Clinic', dentist: 'Dr. Sunshine Lacsamana' },
    { id: 'bacong', name: 'Bacong Dental & Orthodontics', dentist: 'Dr. Jeremiah A. Bacong' },
  ];

  const DEFAULT_PORTAL_CLINIC_ID = 'lacsamana';
  const DEFAULT_DENTIST_NAME = 'Dr. Sherlyn Lacsamana';

  const CLINIC_ROSTERS = {
    lacsamana: [
      { name: 'Dr. Sherlyn Lacsamana', specialty: 'General Dentist', avatarClass: 'pink' },
      { name: 'Dr. Jennelyn Magsino', specialty: 'General Dentist', avatarClass: 'pink' },
      { name: 'Dr. Sunshine Lacsamana', specialty: 'General Dentist', avatarClass: 'pink' },
    ],
  };

  function getDefaultLacsamanaUsers() {
    return [
      {
        id: 'owner',
        name: 'Dr. Sherlyn Lacsamana',
        email: 'sherlyn.lacsamana@dentalsync.com',
        role: 'Owner',
        isOwner: true,
        available: true,
      },
    ];
  }

  function getSubscriptionMaxUsers(sub) {
    if (!sub) return 0;
    return SUBSCRIPTION_PLANS[sub.planId]?.maxUsers ?? 0;
  }

  function enforceSubscriptionUserLimit(data) {
    const sub = data.subscription;
    if (!sub) return false;
    const maxUsers = getSubscriptionMaxUsers(sub);
    if (!maxUsers || maxUsers === Infinity) return false;
    if (!data.clinicUsers.length || data.clinicUsers.length <= maxUsers) return false;

    const owner = data.clinicUsers.find(u => u.isOwner);
    const others = data.clinicUsers.filter(u => !u.isOwner);
    const kept = [];
    if (owner) kept.push(owner);
    kept.push(...others.slice(0, Math.max(0, maxUsers - kept.length)));
    data.clinicUsers = kept.slice(0, maxUsers);
    return true;
  }

  function getDefaultLacsamanaProfile() {
    return {
      name: DEFAULT_DENTIST_NAME,
      specialty: 'General Dentistry',
      clinic: 'Lacsamana Dental Clinic',
      clinicId: DEFAULT_PORTAL_CLINIC_ID,
      email: 'sherlyn.lacsamana@dentalsync.com',
      phone: '+63 917 555 0123',
      license: 'PH-DR-2024-089',
      summary: 'Experienced dental practitioner specializing in restorative care, preventive dentistry, and patient education.',
    };
  }

  const SUBSCRIPTION_PLANS = {
    basic: {
      id: 'basic',
      name: 'Basic Subscription',
      price: 7200,
      period: 'Annually',
      maxUsers: 2,
      features: [
        '1–2 users',
        'Basic patient record tracking',
        'Walk-in scheduling',
        'Online appointment scheduling',
        'Automated reminders',
      ],
    },
    standard: {
      id: 'standard',
      name: 'Standard Subscription',
      price: 12000,
      period: 'Annually',
      maxUsers: 4,
      features: [
        'Everything in the Basic Tier',
        '3–4 users',
      ],
    },
    premium: {
      id: 'premium',
      name: 'Premium Subscription',
      price: 18000,
      period: 'Annually',
      maxUsers: Infinity,
      features: [
        'Unlimited users/devices',
        'Multi-doctor calendar',
      ],
    },
  };

  function emptyData() {
    return {
      appointments: [],
      messages: [],
      treatmentPlans: [],
      disabledSlots: [],
      patientRecords: [],
      clinicPatients: [],
      clinicProfile: null,
      clinicUsers: [],
      subscription: null,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const data = JSON.parse(raw);
      return {
        appointments: Array.isArray(data.appointments) ? data.appointments : [],
        messages: Array.isArray(data.messages) ? data.messages : [],
        treatmentPlans: Array.isArray(data.treatmentPlans) ? data.treatmentPlans : [],
        disabledSlots: Array.isArray(data.disabledSlots) ? data.disabledSlots : [],
        patientRecords: Array.isArray(data.patientRecords) ? data.patientRecords : [],
        clinicPatients: Array.isArray(data.clinicPatients) ? data.clinicPatients : [],
        clinicProfile: data.clinicProfile || null,
        clinicUsers: Array.isArray(data.clinicUsers) ? data.clinicUsers : [],
        subscription: data.subscription || null,
      };
    } catch {
      return emptyData();
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    global.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }

  function uid() {
    return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getPatientName() {
    return localStorage.getItem('userName') || 'Testuser';
  }

  function getDentistName() {
    return localStorage.getItem('dentistName') || DEFAULT_DENTIST_NAME;
  }

  function getPortalClinicId() {
    return localStorage.getItem('dentistClinicId') || DEFAULT_PORTAL_CLINIC_ID;
  }

  function getPortalClinic() {
    return getClinicById(getPortalClinicId()) || getClinicById(DEFAULT_PORTAL_CLINIC_ID);
  }

  function getPortalClinicName() {
    const profile = load().clinicProfile;
    return profile?.clinic || getPortalClinic()?.name || 'Lacsamana Dental Clinic';
  }

  function matchesPortalClinic(record) {
    if (!record) return false;
    const clinicId = getPortalClinicId();
    const clinicName = getPortalClinicName();
    if (record.clinicId === clinicId) return true;
    if (record.clinicName && record.clinicName === clinicName) return true;
    const roster = CLINIC_ROSTERS[clinicId];
    if (roster && record.dentist) {
      const names = roster.map(r => normalizeProviderName(r.name));
      if (names.includes(normalizeProviderName(record.dentist))) return true;
    }
    return false;
  }

  function isLegacyBrualPortalSetup(data) {
    const users = data.clinicUsers || [];
    if (!users.length) return true;
    if (users.length === 1 && (users[0].name || '').includes('Rosita')) return true;
    return false;
  }

  function isLegacyBrualProfile(profile) {
    if (!profile) return true;
    if (profile.email === 'rosita.brual@dentalsync.com') return true;
    if (profile.clinic === 'Dental Sync Clinic') return true;
    if (profile.name && profile.name.includes('Rosita')) return true;
    return false;
  }

  function ensurePortalClinic() {
    const storedDentist = localStorage.getItem('dentistName');
    if (!storedDentist || storedDentist === 'Dr. Rosita A. Brual') {
      localStorage.setItem('dentistName', DEFAULT_DENTIST_NAME);
    }
    if (!localStorage.getItem('dentistClinicId')) {
      localStorage.setItem('dentistClinicId', DEFAULT_PORTAL_CLINIC_ID);
    }

    const data = load();
    let changed = false;

    if (isLegacyBrualPortalSetup(data)) {
      data.clinicUsers = getDefaultLacsamanaUsers();
      changed = true;
    }

    if (isLegacyBrualProfile(data.clinicProfile)) {
      data.clinicProfile = {
        ...getDefaultLacsamanaProfile(),
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }

    if (enforceSubscriptionUserLimit(data)) changed = true;

    if (changed) save(data);
  }

  function getClinicById(clinicId) {
    return CLINICS.find(c => c.id === clinicId) || null;
  }

  function getTodayISO() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTodayStart() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function isPastDateValue(value) {
    if (!value) return false;
    let d = new Date(value);
    if (Number.isNaN(d.getTime()) && !String(value).includes('T')) {
      d = new Date(`${String(value).trim()}T12:00:00`);
    }
    if (Number.isNaN(d.getTime())) return false;
    return d < getTodayStart();
  }

  function isPastCalendarMonth(year, month) {
    const today = new Date();
    return year < today.getFullYear()
      || (year === today.getFullYear() && month < today.getMonth());
  }

  function canNavigateToMonth(year, month) {
    return !isPastCalendarMonth(year, month);
  }

  function applyNoPastDateInputs(root = global.document) {
    if (!root || !root.querySelectorAll) return;
    const todayIso = getTodayISO();
    root.querySelectorAll('input[type="date"]').forEach(input => {
      input.min = todayIso;
      if (input.value && input.value < todayIso) input.value = todayIso;
      if (input.dataset.noPastBound) return;
      input.dataset.noPastBound = '1';
      input.addEventListener('change', () => {
        if (input.value && input.value < getTodayISO()) {
          input.value = getTodayISO();
        }
      });
    });
  }

  function getClinicUsersList() {
    const data = load();
    if (!data.clinicUsers.length) return getDefaultLacsamanaUsers();
    if (enforceSubscriptionUserLimit(data)) save(data);
    return data.clinicUsers;
  }

  function normalizeProviderName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return '';
    return /^dr\.?\s/i.test(trimmed) ? trimmed.replace(/^dr\.?\s*/i, 'Dr. ') : `Dr. ${trimmed}`;
  }

  function dentistInitials(name) {
    const parts = normalizeProviderName(name).replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (parts[0]?.[0] || '?').toUpperCase();
  }

  function isUserAvailable(user) {
    return user && user.available !== false;
  }

  function isDentalProvider(user) {
    const role = (user.role || '').toLowerCase();
    if (role.includes('reception')) return false;
    if (user.isOwner) return true;
    return role.includes('dentist')
      || role.includes('doctor')
      || role.includes('orthodon')
      || role.includes('surgeon')
      || role.includes('owner');
  }

  function clinicUsesAccountTeam(clinicId) {
    if (CLINIC_ROSTERS[clinicId]) return false;
    const clinic = getClinicById(clinicId);
    if (!clinic) return false;
    const users = getClinicUsersList();
    const accountDentist = getDentistName();

    if (clinic.dentist === accountDentist) return true;
    if (users.some(u => normalizeProviderName(u.name) === clinic.dentist)) return true;

    const profile = load().clinicProfile;
    if (profile?.clinic) {
      const profileClinic = profile.clinic.toLowerCase().trim();
      const clinicName = clinic.name.toLowerCase().trim();
      if (profileClinic === clinicName) return true;
      const profileToken = profileClinic.split(/\s+/)[0];
      const clinicToken = clinicName.split(/\s+/)[0];
      const generic = ['dental', 'clinic', 'center', 'orthodontics'];
      if (
        profileToken.length > 2
        && clinicToken.length > 2
        && !generic.includes(profileToken)
        && !generic.includes(clinicToken)
        && profileToken === clinicToken
      ) {
        return true;
      }
    }

    return false;
  }

  function formatDentistFromRoster(entry) {
    return {
      name: entry.name,
      specialty: entry.specialty || 'General Dentist',
      avatar: dentistInitials(entry.name),
      avatarClass: entry.avatarClass || '',
      available: entry.available !== false,
      userId: entry.userId || null,
      isAccountUser: false,
    };
  }

  function formatDentistFromUser(user, profile) {
    const name = normalizeProviderName(user.name);
    let specialty = user.role || 'Dentist';
    if (user.isOwner && profile?.specialty) specialty = profile.specialty;
    else if (user.isOwner) specialty = 'General Dentist';
    const accountDentist = getDentistName();
    return {
      name,
      specialty,
      avatar: dentistInitials(name),
      avatarClass: '',
      available: isUserAvailable(user),
      userId: user.id,
      isAccountUser: user.isOwner || normalizeProviderName(user.name) === accountDentist,
    };
  }

  function formatDentistFromClinic(clinic) {
    const users = getClinicUsersList();
    const match = users.find(u => normalizeProviderName(u.name) === clinic.dentist);
    return {
      name: clinic.dentist,
      specialty: 'General Dentist',
      avatar: dentistInitials(clinic.dentist),
      avatarClass: '',
      available: match ? isUserAvailable(match) : true,
      userId: match?.id || null,
      isAccountUser: clinic.dentist === getDentistName(),
    };
  }

  function resolveAvailableDentists(clinicId) {
    const clinic = getClinicById(clinicId);
    if (!clinic) return [];

    if (CLINIC_ROSTERS[clinicId]) {
      const users = getClinicUsersList();
      return CLINIC_ROSTERS[clinicId].map(entry => {
        const formatted = formatDentistFromRoster(entry);
        const user = users.find(u => normalizeProviderName(u.name) === normalizeProviderName(entry.name));
        if (user) {
          formatted.available = isUserAvailable(user);
          formatted.userId = user.id;
          formatted.isAccountUser = user.isOwner || normalizeProviderName(user.name) === getDentistName();
        }
        return formatted;
      });
    }

    if (clinicUsesAccountTeam(clinicId)) {
      const profile = load().clinicProfile;
      const providers = getClinicUsersList().filter(isDentalProvider);
      if (providers.length) {
        return providers.map(u => formatDentistFromUser(u, profile));
      }
    }

    return [formatDentistFromClinic(clinic)];
  }

  function setClinicUserAvailabilityInner(userId, available) {
    const data = load();
    let users = data.clinicUsers.length ? data.clinicUsers.slice() : getClinicUsersList().map(u => ({ ...u }));
    const user = users.find(u => u.id === userId);
    if (!user) return { error: 'User not found.' };
    if (!isDentalProvider(user)) return { error: 'Only dentists can set availability.' };
    user.available = !!available;
    data.clinicUsers = users;
    save(data);
    return { user };
  }

  function formatTimeLabel(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (sameDay) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function extractStartTime(timeRange) {
    if (!timeRange) return '—';
    return timeRange.split(/[–-]/)[0].trim();
  }

  function parseTimeToMinutes(t) {
    if (!t) return 0;
    const m = String(t).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return 0;
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && hh !== 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;
    return hh * 60 + mm;
  }

  function parseTimeRange(timeRange) {
    if (!timeRange) return { start: 0, end: 0 };
    const parts = String(timeRange).split(/\s*[–-]\s*/);
    const start = parseTimeToMinutes(parts[0]);
    const end = parts[1] ? parseTimeToMinutes(parts[1]) : start;
    return { start, end: end > start ? end : start };
  }

  function parseDurationMinutes(value) {
    if (typeof value === 'number' && value > 0) return value;
    const m = String(value || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 30;
  }

  function getAppointmentRange(appt) {
    const start = typeof appt.startMinutes === 'number'
      ? appt.startMinutes
      : parseTimeToMinutes(extractStartTime(appt.time));
    const duration = parseDurationMinutes(appt.durationMinutes || appt.duration);
    const end = typeof appt.endMinutes === 'number'
      ? appt.endMinutes
      : start + duration;
    return { start, end: Math.max(end, start + duration) };
  }

  /** True when [startA, endA) shares any minute with [startB, endB). */
  function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  function isBlockingAppointment(status) {
    return status === 'pending' || status === 'in_progress' || status === 'confirmed';
  }

  function formatMinutesRange(start, end) {
    return `${minutesToTimeStr(start)} – ${minutesToTimeStr(end)}`;
  }

  function minutesToTimeStr(total) {
    total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hr12 = ((hh + 11) % 12) + 1;
    return `${hr12}:${mm.toString().padStart(2, '0')} ${ampm}`;
  }

  function toISODateString(dateStr) {
    if (!dateStr) return '';
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(dateStr) {
    const iso = toISODateString(dateStr);
    if (!iso) return dateStr || '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function normalizeDateKey(dateStr) {
    const iso = toISODateString(dateStr);
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toDateString();
  }

  function resolveOperatoryForAppointment(appt) {
    if (appt.operatory) return String(appt.operatory);
    const clinicId = appt.clinicId || getPortalClinicId();
    const roster = CLINIC_ROSTERS[clinicId];
    if (roster && appt.dentist) {
      const target = normalizeProviderName(appt.dentist);
      const idx = roster.findIndex(r => normalizeProviderName(r.name) === target);
      if (idx >= 0) return String(idx + 1);
    }
    return '1';
  }

  function getClinicScheduleAppointments(dateStr) {
    if (!dateStr) return [];
    const dayKey = normalizeDateKey(dateStr);
    return load().appointments.filter(a => {
      if (!matchesPortalClinic(a)) return false;
      if (normalizeDateKey(a.date) !== dayKey) return false;
      const status = a.status || 'pending';
      return status !== 'cancelled' && status !== 'completed';
    });
  }

  function getClinicDisabledSlotsForDate(dateStr) {
    if (!dateStr) return [];
    const dayKey = normalizeDateKey(dateStr);
    return load().disabledSlots.filter(d => normalizeDateKey(d.date) === dayKey);
  }

  function getOperatoryColumns(clinicId) {
    const id = clinicId || getPortalClinicId();
    const roster = CLINIC_ROSTERS[id];
    if (!roster || !roster.length) {
      return [
        { value: '1', name: 'Dentist 1' },
        { value: '2', name: 'Dentist 2' },
        { value: '3', name: 'Dentist 3' },
      ];
    }
    return roster.map((entry, index) => ({
      value: String(index + 1),
      name: entry.name,
    }));
  }

  function getDentistNameForOperatory(opValue, clinicId) {
    const col = getOperatoryColumns(clinicId).find(c => c.value === String(opValue));
    return col?.name || '';
  }

  function getBookedRangesForDate(dateStr, dentist, clinicId) {
    if (!dateStr || !dentist) return [];
    const dayKey = normalizeDateKey(dateStr);
    const opValue = resolveOperatoryForAppointment({ dentist, clinicId });

    const bookings = load().appointments
      .filter(a => {
        if (a.dentist !== dentist || !isBlockingAppointment(a.status)) return false;
        if (clinicId && a.clinicId && a.clinicId !== clinicId) return false;
        return normalizeDateKey(a.date) === dayKey;
      })
      .map(a => {
        const range = getAppointmentRange(a);
        return { ...range, patientName: a.patientName, service: a.service, source: a.source };
      });

    const disabled = load().disabledSlots
      .filter(d => {
        if (normalizeDateKey(d.date) !== dayKey) return false;
        if (d.operatory && opValue && String(d.operatory) !== String(opValue)) return false;
        return true;
      })
      .map(d => ({
        start: d.startMinutes,
        end: d.endMinutes,
        patientName: 'Unavailable',
        service: d.reason || 'Blocked Out Slot',
        isDisabled: true,
        id: d.id,
      }));

    return [...bookings, ...disabled].sort((a, b) => a.start - b.start);
  }

  function findBookingConflict(slotStart, slotEnd, bookedRanges) {
    for (const booked of bookedRanges) {
      if (rangesOverlap(slotStart, slotEnd, booked.start, booked.end)) {
        return booked;
      }
    }
    return null;
  }

  const DentalSync = {
    STORAGE_KEY,
    UPDATE_EVENT,
    CLINICS,
    SUBSCRIPTION_PLANS,
    load,
    getPatientName,
    getDentistName,
    getPortalClinicId,
    getPortalClinic,
    getPortalClinicName,
    ensurePortalClinic,
    getClinicById,
    getTodayISO,
    getTodayStart,
    isPastDateValue,
    isPastCalendarMonth,
    canNavigateToMonth,
    applyNoPastDateInputs,
    formatTimeLabel,
    extractStartTime,
    parseTimeToMinutes,
    parseTimeRange,
    parseDurationMinutes,
    getAppointmentRange,
    rangesOverlap,
    normalizeDateKey,
    toISODateString,
    formatDisplayDate,
    resolveOperatoryForAppointment,
    getClinicScheduleAppointments,
    getClinicDisabledSlotsForDate,
    getOperatoryColumns,
    getDentistNameForOperatory,
    getBookedRangesForDate,
    isBlockingAppointment,
    findBookingConflict,
    formatMinutesRange,

    addAppointment(appt) {
      const data = load();
      const createdAt = new Date().toISOString();
      const record = {
        id: uid(),
        status: 'pending',
        createdAt,
        patientName: getPatientName(),
        source: 'patient',
        additionalNotes: appt.additionalNotes || '',
        ...appt,
        date: toISODateString(appt.date) || appt.date,
        clinicId: appt.clinicId || null,
      };

      data.appointments.unshift(record);
      const notesPart = record.additionalNotes ? ` Notes: ${record.additionalNotes}` : '';
      data.messages.unshift({
        id: uid(),
        threadId: uid(),
        type: 'appointment',
        from: 'patient',
        patientName: record.patientName,
        dentist: record.dentist,
        clinicId: record.clinicId,
        clinicName: record.clinicName,
        subject: 'New appointment booking',
        body: `${record.patientName} booked ${record.service} on ${record.date} at ${record.time} at ${record.clinicName}.${notesPart}`,
        read: false,
        createdAt,
        appointmentId: record.id,
      });

      save(data);
      return record;
    },

    addMessage(msg) {
      const data = load();
      const createdAt = new Date().toISOString();
      const threadId = msg.threadId || uid();
      const record = {
        id: uid(),
        threadId,
        type: msg.type || 'message',
        from: msg.from || 'patient',
        read: false,
        createdAt,
        patientName: msg.from === 'dentist' ? msg.patientName : getPatientName(),
        ...msg,
      };
      data.messages.unshift(record);
      save(data);
      return record;
    },

    addReply(threadId, body, fromSide) {
      const data = load();
      const thread = data.messages.find(m => m.threadId === threadId);
      if (!thread) return null;
      const from = fromSide === 'dentist' ? 'dentist' : 'patient';
      const record = {
        id: uid(),
        threadId,
        type: 'message',
        from,
        patientName: thread.patientName,
        dentist: thread.dentist,
        clinicId: thread.clinicId,
        clinicName: thread.clinicName,
        subject: from === 'dentist' ? `Reply from ${thread.dentist || 'clinic'}` : `Reply from ${thread.patientName}`,
        body,
        read: false,
        createdAt: new Date().toISOString(),
      };
      data.messages.unshift(record);
      save(data);
      return record;
    },

    getMessageThreads(filter = {}) {
      let list = load().messages.slice();
      if (filter.clinicPortal) list = list.filter(matchesPortalClinic);
      else if (filter.dentist) list = list.filter(m => m.dentist === filter.dentist);
      if (filter.patientName) list = list.filter(m => m.patientName === filter.patientName);

      const map = new Map();
      list.forEach(msg => {
        const key = msg.threadId || msg.id;
        if (!map.has(key)) {
          map.set(key, { threadId: key, messages: [], latestAt: msg.createdAt, unread: 0 });
        }
        const thread = map.get(key);
        thread.messages.push(msg);
        if (new Date(msg.createdAt) > new Date(thread.latestAt)) thread.latestAt = msg.createdAt;
        if (!msg.read && msg.from !== (filter.viewerSide || (filter.dentist ? 'dentist' : 'patient'))) thread.unread += 1;
      });

      return [...map.values()]
        .map(t => {
          t.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          t.root = t.messages[0];
          return t;
        })
        .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));
    },

    getAppointments(filter = {}) {
      let list = load().appointments.slice();
      if (filter.clinicPortal) list = list.filter(matchesPortalClinic);
      else if (filter.dentist) list = list.filter(a => a.dentist === filter.dentist);
      if (filter.patientName) list = list.filter(a => a.patientName === filter.patientName);
      if (filter.onlineOnly) {
        list = list.filter(a => a.source === 'patient' || (!a.source && !a.operatory));
      }
      return list;
    },

    getMessages(filter = {}) {
      let list = load().messages.slice();
      if (filter.clinicPortal) list = list.filter(matchesPortalClinic);
      else if (filter.dentist) list = list.filter(m => m.dentist === filter.dentist);
      if (filter.patientName) list = list.filter(m => m.patientName === filter.patientName);
      if (filter.unread) list = list.filter(m => !m.read);
      return list;
    },

    markMessageRead(id) {
      const data = load();
      const msg = data.messages.find(m => m.id === id);
      if (msg) msg.read = true;
      save(data);
    },

    markAllMessagesRead(dentist) {
      const data = load();
      data.messages.forEach(m => {
        if (dentist === 'clinicPortal') {
          if (matchesPortalClinic(m)) m.read = true;
        } else if (!dentist || m.dentist === dentist) {
          m.read = true;
        }
      });
      save(data);
    },

    removeMessageThread(threadId) {
      if (!threadId) return false;
      const data = load();
      const before = data.messages.length;
      data.messages = data.messages.filter(m => {
        const key = m.threadId || m.id;
        return key !== threadId;
      });
      if (data.messages.length === before) return false;
      save(data);
      return true;
    },

    removeAllMessages(filter = {}) {
      const data = load();
      const before = data.messages.length;
      data.messages = data.messages.filter(m => {
        if (filter.patientName && m.patientName === filter.patientName) return false;
        if (filter.clinicPortal && matchesPortalClinic(m)) return false;
        if (filter.dentist && m.dentist === filter.dentist) return false;
        return true;
      });
      if (data.messages.length === before) return 0;
      save(data);
      return before - data.messages.length;
    },

    updateAppointmentStatus(id, status) {
      const data = load();
      const appt = data.appointments.find(a => a.id === id);
      if (appt) {
        appt.status = status;
        save(data);
      }
    },

    confirmAppointment(id, dentistNotes = '') {
      const data = load();
      const appt = data.appointments.find(a => a.id === id);
      if (!appt) return null;

      appt.status = 'completed';
      appt.confirmedAt = new Date().toISOString();
      appt.completedAt = appt.confirmedAt;
      appt.dentistNotes = dentistNotes;

      const noteText = dentistNotes || appt.additionalNotes || 'Visit completed';
      const record = {
        id: uid(),
        patientName: appt.patientName,
        date: appt.date,
        procedure: appt.service,
        dentist: appt.dentist,
        clinicName: appt.clinicName || '',
        notes: noteText,
        status: 'Completed',
        appointmentId: appt.id,
        createdAt: new Date().toISOString(),
      };
      data.patientRecords.unshift(record);

      const existing = data.clinicPatients.find(p => p.name === appt.patientName);
      const patientEntry = {
        name: appt.patientName,
        lastVisit: appt.date,
        lastTreatment: appt.service,
        nextAppointment: '—',
        condition: appt.service,
        status: 'Stable',
        statusClass: 'completed',
        note: noteText,
      };
      if (existing) Object.assign(existing, patientEntry);
      else data.clinicPatients.unshift(patientEntry);

      const threadId = uid();
      data.messages.unshift({
        id: uid(),
        threadId,
        type: 'appointment',
        from: 'dentist',
        patientName: appt.patientName,
        dentist: appt.dentist,
        clinicId: appt.clinicId,
        clinicName: appt.clinicName,
        subject: 'Visit completed',
        body: `Your ${appt.service} on ${appt.date} at ${extractStartTime(appt.time)} has been completed.${dentistNotes ? ` Notes: ${dentistNotes}` : ''}`,
        read: false,
        createdAt: new Date().toISOString(),
        appointmentId: appt.id,
      });

      save(data);
      return { appt, record };
    },

    getPatientRecords(patientName) {
      const data = load();
      let records = patientName
        ? data.patientRecords.filter(r => r.patientName === patientName)
        : data.patientRecords.slice();

      return records.map(rec => {
        if (rec.dentist) return rec;
        if (rec.appointmentId) {
          const appt = data.appointments.find(a => a.id === rec.appointmentId);
          if (appt?.dentist) return { ...rec, dentist: appt.dentist };
        }
        return rec;
      });
    },

    getClinicPatients() {
      return load().clinicPatients.slice();
    },

    getAllPatientNames() {
      const data = load();
      const names = new Set();
      data.clinicPatients.forEach(p => {
        if (p.name) names.add(p.name.trim());
      });
      data.patientRecords.forEach(r => {
        if (r.patientName) names.add(r.patientName.trim());
      });
      data.appointments.forEach(a => {
        if (a.patientName) names.add(a.patientName.trim());
      });
      return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
    },

    upsertClinicPatient(entry) {
      const data = load();
      const name = (entry.name || '').trim();
      if (!name) return null;
      const existing = data.clinicPatients.find(p => p.name === name);
      const record = {
        name,
        lastVisit: entry.lastVisit || existing?.lastVisit || '—',
        lastTreatment: entry.lastTreatment || existing?.lastTreatment || '—',
        nextAppointment: entry.nextAppointment || existing?.nextAppointment || '—',
        condition: entry.condition || existing?.condition || '—',
        status: entry.status || existing?.status || 'Stable',
        statusClass: entry.statusClass || existing?.statusClass || 'completed',
        note: entry.note || existing?.note || '',
      };
      if (existing) Object.assign(existing, record);
      else data.clinicPatients.unshift(record);
      save(data);
      return record;
    },

    ensureDefaultPatients() {
      const data = load();
      if (data.clinicPatients.length > 0) return;
      const defaults = [
        { name: 'Maria Lopez', lastVisit: 'May 4, 2026', lastTreatment: 'Teeth Cleaning', nextAppointment: 'May 11, 2026', condition: 'Teeth Cleaning', status: 'Stable', statusClass: 'completed' },
        { name: 'John Bautista', lastVisit: 'May 7, 2026', lastTreatment: 'Root Canal', nextAppointment: 'May 11, 2026', condition: 'Root Canal', status: 'In Treatment', statusClass: 'warning' },
        { name: 'Rosa Dela Cruz', lastVisit: 'May 8, 2026', lastTreatment: 'Fillings', nextAppointment: 'May 11, 2026', condition: 'Fillings', status: 'Review', statusClass: 'teal' },
        { name: 'Kevin Ong', lastVisit: 'May 9, 2026', lastTreatment: 'Consultation', nextAppointment: 'May 13, 2026', condition: 'Consultation', status: 'Confirmed', statusClass: 'completed' },
        { name: 'Luna Santos', lastVisit: 'May 10, 2026', lastTreatment: 'Cavity Filling', nextAppointment: 'May 16, 2026', condition: 'Cavity Filling', status: 'Scheduled', statusClass: 'warning' },
      ];
      data.clinicPatients = defaults;
      save(data);
    },

    getSubscription() {
      return load().subscription;
    },

    setSubscription(planId, payment = null) {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) return null;
      const data = load();
      data.subscription = {
        planId,
        planName: plan.name,
        maxUsers: plan.maxUsers,
        price: plan.price,
        period: plan.period,
        purchasedAt: new Date().toISOString(),
        ...(payment ? {
          paymentMethod: payment.method,
          paymentReference: payment.reference || '',
          paymentStatus: 'paid',
          paidAt: new Date().toISOString(),
        } : {}),
      };
      if (!data.clinicUsers.length) data.clinicUsers = getDefaultLacsamanaUsers();
      enforceSubscriptionUserLimit(data);
      save(data);
      return data.subscription;
    },

    getSubscriptionMaxUsers() {
      return getSubscriptionMaxUsers(load().subscription);
    },

    canAddClinicUser() {
      const data = load();
      const sub = data.subscription;
      if (!sub) return { ok: false, error: 'Subscribe to a plan before adding users.' };
      const maxUsers = getSubscriptionMaxUsers(sub);
      const users = data.clinicUsers.length ? data.clinicUsers : getDefaultLacsamanaUsers();
      if (maxUsers !== Infinity && users.length >= maxUsers) {
        return { ok: false, error: `Your ${sub.planName} allows up to ${maxUsers} user${maxUsers === 1 ? '' : 's'}.` };
      }
      return { ok: true, maxUsers, current: users.length };
    },

    getSubscriptionPlan() {
      const sub = load().subscription;
      return sub ? SUBSCRIPTION_PLANS[sub.planId] || null : null;
    },

    getClinicProfile() {
      const data = load();
      if (data.clinicProfile) return data.clinicProfile;
      return getDefaultLacsamanaProfile();
    },

    saveClinicProfile(profile) {
      const data = load();
      const current = data.clinicProfile || getDefaultLacsamanaProfile();
      data.clinicProfile = { ...current, ...profile, updatedAt: new Date().toISOString() };
      save(data);
      return data.clinicProfile;
    },

    getClinicUsers() {
      return getClinicUsersList();
    },

    getAvailableDentists(clinicId) {
      return resolveAvailableDentists(clinicId);
    },

    isDentalProviderUser(user) {
      return isDentalProvider(user);
    },

    isUserAvailable(user) {
      return isUserAvailable(user);
    },

    setClinicUserAvailability(userId, available) {
      return setClinicUserAvailabilityInner(userId, available);
    },

    toggleClinicUserAvailability(userId) {
      const user = getClinicUsersList().find(u => u.id === userId);
      if (!user) return { error: 'User not found.' };
      return setClinicUserAvailabilityInner(userId, !isUserAvailable(user));
    },

    addClinicUser(user) {
      const data = load();
      const canAdd = DentalSync.canAddClinicUser();
      if (!canAdd.ok) return { error: canAdd.error };
      let users = data.clinicUsers.length ? data.clinicUsers : getDefaultLacsamanaUsers();
      const record = {
        id: uid(),
        name: user.name,
        email: user.email,
        role: user.role || 'Staff',
        isOwner: false,
        available: isDentalProvider({ role: user.role || 'Staff', isOwner: false }) ? true : undefined,
        createdAt: new Date().toISOString(),
      };
      users.push(record);
      data.clinicUsers = users;
      save(data);
      return { user: record };
    },

    removeClinicUser(id) {
      const data = load();
      const users = data.clinicUsers.length ? data.clinicUsers : getDefaultLacsamanaUsers();
      const target = users.find(u => u.id === id);
      if (!target) return { error: 'User not found.' };
      if (target.isOwner) return { error: 'The owner account cannot be deleted.' };
      data.clinicUsers = users.filter(u => u.id !== id);
      save(data);
      return { ok: true };
    },

    removeAppointment(id) {
      const data = load();
      data.appointments = data.appointments.filter(a => a.id !== id);
      data.messages = data.messages.filter(m => m.appointmentId !== id);
      save(data);
    },

    getTreatmentPlans(patientName) {
      const plans = load().treatmentPlans;
      if (!patientName) return plans;
      return plans.filter(p => p.patientName === patientName);
    },

    getTreatmentPlan(patientName) {
      return load().treatmentPlans.find(p => p.patientName === patientName) || null;
    },

    saveTreatmentPlan(plan) {
      const data = load();
      const idx = data.treatmentPlans.findIndex(p => p.patientName === plan.patientName);
      const record = { id: plan.id || uid(), updatedAt: new Date().toISOString(), ...plan };
      if (idx >= 0) data.treatmentPlans[idx] = { ...data.treatmentPlans[idx], ...record };
      else data.treatmentPlans.push(record);
      save(data);
      return record;
    },

    scheduleTreatmentVisit(patientName, visitId, appointmentMeta) {
      const data = load();
      const plan = data.treatmentPlans.find(p => p.patientName === patientName);
      if (!plan) return null;
      const visit = plan.visits.find(v => v.id === visitId);
      if (!visit) return null;
      visit.scheduled = true;
      visit.scheduledDate = appointmentMeta.date;
      visit.scheduledTime = appointmentMeta.time;
      visit.appointmentId = appointmentMeta.appointmentId;
      save(data);
      return visit;
    },

    addAppointmentFromDentist(appt) {
      const data = load();
      const createdAt = new Date().toISOString();
      const dentist = appt.dentist || getDentistName();
      const clinic = getClinicById(appt.clinicId || getPortalClinicId()) || getPortalClinic() || CLINICS[0];
      const record = {
        id: uid(),
        status: 'confirmed',
        source: 'dentist',
        createdAt,
        patientName: appt.patientName,
        dentist,
        clinicId: appt.clinicId || clinic.id,
        clinicName: appt.clinicName || clinic.name,
        service: appt.service,
        duration: appt.duration || `~${appt.durationMinutes || 60} min`,
        durationMinutes: appt.durationMinutes || 60,
        date: toISODateString(appt.date) || appt.date,
        time: appt.time,
        startMinutes: appt.startMinutes,
        endMinutes: appt.endMinutes,
        operatory: appt.operatory || resolveOperatoryForAppointment({ dentist, clinicId: clinic.id }),
        tooth: appt.tooth || null,
        treatmentVisitId: appt.treatmentVisitId || null,
      };

      if (typeof record.startMinutes !== 'number') {
        record.startMinutes = parseTimeToMinutes(extractStartTime(record.time));
      }
      if (typeof record.endMinutes !== 'number') {
        record.endMinutes = record.startMinutes + parseDurationMinutes(record.durationMinutes);
      }

      data.appointments.unshift(record);
      data.messages.unshift({
        id: uid(),
        type: 'appointment',
        from: 'dentist',
        patientName: record.patientName,
        dentist: record.dentist,
        clinicId: record.clinicId,
        clinicName: record.clinicName,
        subject: 'Appointment scheduled by dentist',
        body: `${dentist} scheduled ${record.service} for ${record.patientName} on ${record.date} at ${record.time}.`,
        read: false,
        createdAt,
        appointmentId: record.id,
      });

      save(data);
      return record;
    },

    formatBookingDate(dateStr) {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    },

    isFinishedAppointment(status) {
      return status === 'confirmed' || status === 'completed';
    },

    addDisabledSlot(dSlot) {
      const data = load();
      const record = {
        id: uid(),
        createdAt: new Date().toISOString(),
        ...dSlot,
        date: toISODateString(dSlot.date) || dSlot.date,
      };
      data.disabledSlots.push(record);
      save(data);
      return record;
    },

    removeDisabledSlot(id) {
      const data = load();
      data.disabledSlots = data.disabledSlots.filter(d => d.id !== id);
      save(data);
    },

    onUpdate(callback) {
      global.addEventListener(UPDATE_EVENT, callback);
      global.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) callback();
      });
    },
  };

  global.DentalSync = DentalSync;
})(window);
