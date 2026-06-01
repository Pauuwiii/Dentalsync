// profile.js — Editable dentist profile + team users by subscription



const profileForm = document.getElementById('profileForm');

const addUserForm = document.getElementById('addUserForm');

const usersList = document.getElementById('clinicUsersList');

const subscriptionHint = document.getElementById('subscriptionHint');



function loadProfileForm() {

  const p = DentalSync.getClinicProfile();

  if (!profileForm) return;

  profileForm.name.value = p.name || '';

  profileForm.specialty.value = p.specialty || '';

  profileForm.clinic.value = p.clinic || '';

  profileForm.email.value = p.email || '';

  profileForm.phone.value = p.phone || '';

  profileForm.license.value = p.license || '';

  profileForm.summary.value = p.summary || '';

}



function isAccountUser(u) {

  const accountName = DentalSync.getDentistName();

  const normalized = (name) => {

    const n = (name || '').trim();

    return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`;

  };

  return u.isOwner || normalized(u.name) === accountName;

}



function renderUsers() {

  if (!usersList) return;

  const users = DentalSync.getClinicUsers();

  const sub = DentalSync.getSubscription();

  const plan = DentalSync.getSubscriptionPlan();



  if (subscriptionHint) {

    if (!sub) {

      subscriptionHint.textContent = 'Subscribe to a plan to add team users.';

    } else {

      const max = plan?.maxUsers === Infinity ? 'Unlimited' : plan?.maxUsers;

      subscriptionHint.textContent = `${sub.planName} · ${users.length} / ${max} users`;

      if (plan?.maxUsers !== Infinity && users.length >= plan.maxUsers) {

        subscriptionHint.textContent += ' · User limit reached';

      }

    }

  }



  const canAdd = DentalSync.canAddClinicUser();

  if (addUserForm) {

    addUserForm.style.display = canAdd.ok ? '' : 'none';

  }

  const addUserHint = document.getElementById('addUserHint');

  if (addUserHint) {

    if (!sub) {

      addUserHint.textContent = 'Subscribe first to add team users.';

      addUserHint.style.display = '';

    } else if (!canAdd.ok) {

      addUserHint.textContent = canAdd.error + ' Upgrade your plan on the Subscription page to add more.';

      addUserHint.style.display = '';

    } else {

      addUserHint.style.display = 'none';

    }

  }



  usersList.innerHTML = users.map(u => {

    const isProvider = DentalSync.isDentalProviderUser(u);

    const available = DentalSync.isUserAvailable(u);

    const isYou = isAccountUser(u);

    const availabilityBtn = isProvider

      ? `<button type="button" class="btn btn-sm availability-toggle ${available ? 'btn-primary' : 'btn-outline'}" data-id="${u.id}">${available ? 'Available' : 'Unavailable'}</button>`

      : '';

    const youBadge = isYou ? '<span class="account-you-badge">Your account</span>' : '';

    const deleteBtn = u.isOwner ? '' : `<button type="button" class="btn btn-danger btn-sm delete-user-btn" data-id="${u.id}" data-name="${u.name}">Delete User</button>`;



    return `

    <div class="clinic-user-row">

      <div style="flex:1;">

        <p style="font-weight:600;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">

          ${u.name} ${youBadge}

        </p>

        <p style="color:var(--text-muted);font-size:0.88rem;margin:4px 0 0;">${u.email} · ${u.role}${u.isOwner ? ' · Owner' : ''}</p>

      </div>

      <div class="clinic-user-actions">

        ${availabilityBtn}

        ${deleteBtn}

      </div>

    </div>`;

  }).join('');



  usersList.querySelectorAll('.availability-toggle').forEach(btn => {

    btn.addEventListener('click', () => {

      const result = DentalSync.toggleClinicUserAvailability(btn.dataset.id);

      if (result?.error) {

        showToast(result.error, 'warn');

        return;

      }

      const nowAvailable = DentalSync.isUserAvailable(result.user);

      showToast(`${result.user.name} is now ${nowAvailable ? 'Available' : 'Unavailable'}.`, 'success');

      renderUsers();

    });

  });



  usersList.querySelectorAll('.delete-user-btn').forEach(btn => {

    btn.addEventListener('click', () => {

      const name = btn.dataset.name || 'this user';

      if (!confirm(`Delete user account for ${name}? This cannot be undone.`)) return;

      const result = DentalSync.removeClinicUser(btn.dataset.id);

      if (result?.error) {

        showToast(result.error, 'warn');

        return;

      }

      renderUsers();

      showToast(`${name} has been removed from your clinic.`, 'success');

    });

  });

}



if (profileForm) {

  loadProfileForm();

  profileForm.addEventListener('submit', e => {

    e.preventDefault();

    DentalSync.saveClinicProfile({

      name: profileForm.name.value.trim(),

      specialty: profileForm.specialty.value.trim(),

      clinic: profileForm.clinic.value.trim(),

      email: profileForm.email.value.trim(),

      phone: profileForm.phone.value.trim(),

      license: profileForm.license.value.trim(),

      summary: profileForm.summary.value.trim(),

    });

    showToast('Profile saved.', 'success');

    renderUsers();

  });

}



if (addUserForm) {

  addUserForm.addEventListener('submit', e => {

    e.preventDefault();

    const result = DentalSync.addClinicUser({

      name: addUserForm.userName.value.trim(),

      email: addUserForm.userEmail.value.trim(),

      role: addUserForm.userRole.value.trim() || 'Staff',

    });

    if (result.error) {

      showToast(result.error, 'warn');

      return;

    }

    addUserForm.reset();

    renderUsers();

    showToast('User added to your clinic.', 'success');

  });

}



DentalSync.ensurePortalClinic();
loadProfileForm();
renderUsers();

DentalSync.onUpdate(() => {
  loadProfileForm();
  renderUsers();
});


