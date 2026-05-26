const state = {
  users: [],
  loading: false,
};

const dom = {};

function setupDom() {
  dom.usersTableBody = document.querySelector('#users-table tbody');
  dom.feedback = document.getElementById('feedback');
  dom.form = document.getElementById('user-form');
  dom.formTitle = document.getElementById('form-title');

  dom.userId = document.getElementById('user-id');
  dom.nom = document.getElementById('nom');
  dom.prenom = document.getElementById('prenom');
  dom.email = document.getElementById('email');
  dom.password = document.getElementById('password');
  dom.telephone = document.getElementById('telephone');
  dom.adresse = document.getElementById('adresse');

  dom.roleClient = document.getElementById('role-client');
  dom.roleAuteur = document.getElementById('role-auteur');
  dom.roleEditeur = document.getElementById('role-editeur');

  dom.clientDetails = document.getElementById('client-details');
  dom.auteurDetails = document.getElementById('auteur-details');
  dom.editeurDetails = document.getElementById('editeur-details');

  dom.adresseLivraison = document.getElementById('adresse-livraison');
  dom.bio = document.getElementById('bio');
  dom.iban = document.getElementById('iban');
  dom.siret = document.getElementById('siret');
  dom.nomMaison = document.getElementById('nom-maison');

  dom.saveBtn = document.getElementById('save-btn');
  dom.resetBtn = document.getElementById('reset-btn');
  dom.refreshBtn = document.getElementById('refresh-btn');
  dom.logoutBtn = document.getElementById('logout-btn');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showFeedback(message, isError = false) {
  dom.feedback.hidden = false;
  dom.feedback.classList.toggle('error', isError);
  dom.feedback.textContent = message;
}

function clearFeedback() {
  dom.feedback.hidden = true;
  dom.feedback.classList.remove('error');
  dom.feedback.textContent = '';
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Erreur API (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function ensureAdminAuth() {
  try {
    const me = await api('/api/auth/me');
    if (!me?.authenticated || !me?.user?.is_admin) {
      window.location.replace(`/admin-login?next=${encodeURIComponent('/admin/users')}`);
      return false;
    }
    return true;
  } catch (_) {
    window.location.replace(`/admin-login?next=${encodeURIComponent('/admin/users')}`);
    return false;
  }
}

function roleBadges(user) {
  const badges = [];
  if (user.is_client) badges.push('<span class="badge client">client</span>');
  if (user.is_auteur) badges.push('<span class="badge">auteur</span>');
  if (user.is_editeur) badges.push('<span class="badge">editeur</span>');
  if (user.is_admin) badges.push('<span class="badge admin">admin</span>');
  return badges.join(' ');
}

function renderUsers() {
  if (!state.users.length) {
    dom.usersTableBody.innerHTML = '<tr><td colspan="5">Aucun utilisateur.</td></tr>';
    return;
  }

  dom.usersTableBody.innerHTML = state.users
    .map(
      (user) => `
      <tr data-id="${user.id_utilisateur}">
        <td>${user.id_utilisateur}</td>
        <td>${escapeHtml(user.prenom)} ${escapeHtml(user.nom)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="badges">${roleBadges(user)}</span></td>
        <td class="row-actions"><button type="button" data-action="edit" data-id="${user.id_utilisateur}">Editer</button></td>
      </tr>
      `,
    )
    .join('');
}

async function loadUsers() {
  state.loading = true;
  dom.refreshBtn.disabled = true;

  try {
    state.users = await api('/api/admin/users');
    renderUsers();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      window.location.replace(`/admin-login?next=${encodeURIComponent('/admin/users')}`);
      return;
    }
    showFeedback(err.message, true);
  } finally {
    state.loading = false;
    dom.refreshBtn.disabled = false;
  }
}

function applyRoleVisibility() {
  const showClient = dom.roleClient.checked;
  const showAuteur = dom.roleAuteur.checked;
  const showEditeur = dom.roleEditeur.checked;

  dom.clientDetails.classList.toggle('hidden', !showClient);
  dom.auteurDetails.classList.toggle('hidden', !showAuteur);
  dom.editeurDetails.classList.toggle('hidden', !showEditeur);

  dom.iban.required = showAuteur;
  dom.siret.required = showEditeur;
  dom.nomMaison.required = showEditeur;
}

function resetForm() {
  dom.form.reset();
  dom.userId.value = '';
  dom.formTitle.textContent = 'Nouvel utilisateur';
  dom.password.required = true;
  dom.roleClient.checked = true;
  dom.roleAuteur.checked = false;
  dom.roleEditeur.checked = false;
  applyRoleVisibility();
}

function fillForm(user) {
  dom.userId.value = String(user.id_utilisateur);
  dom.nom.value = user.nom || '';
  dom.prenom.value = user.prenom || '';
  dom.email.value = user.email || '';
  dom.password.value = '';
  dom.password.required = false;
  dom.telephone.value = user.telephone || '';
  dom.adresse.value = user.adresse || '';

  dom.roleClient.checked = Boolean(user.is_client);
  dom.roleAuteur.checked = Boolean(user.is_auteur);
  dom.roleEditeur.checked = Boolean(user.is_editeur);

  dom.adresseLivraison.value = user.adresse_livraison || '';
  dom.bio.value = user.bio || '';
  dom.iban.value = user.iban || '';
  dom.siret.value = user.siret || '';
  dom.nomMaison.value = user.nom_maison || '';

  dom.formTitle.textContent = `Edition utilisateur #${user.id_utilisateur}`;
  applyRoleVisibility();
}

function findUserById(userId) {
  return state.users.find((user) => user.id_utilisateur === userId) || null;
}

function buildPayload() {
  return {
    nom: dom.nom.value.trim(),
    prenom: dom.prenom.value.trim(),
    email: dom.email.value.trim(),
    password: dom.password.value,
    telephone: dom.telephone.value.trim(),
    adresse: dom.adresse.value.trim(),
    roles: {
      client: dom.roleClient.checked,
      auteur: dom.roleAuteur.checked,
      editeur: dom.roleEditeur.checked,
    },
    details: {
      adresse_livraison: dom.adresseLivraison.value.trim(),
      bio: dom.bio.value.trim(),
      iban: dom.iban.value.trim(),
      siret: dom.siret.value.trim(),
      nom_maison: dom.nomMaison.value.trim(),
    },
  };
}

async function submitForm(event) {
  event.preventDefault();
  clearFeedback();

  dom.saveBtn.disabled = true;
  dom.saveBtn.textContent = 'Enregistrement...';

  try {
    const userId = Number.parseInt(dom.userId.value, 10);
    const payload = buildPayload();

    if (Number.isInteger(userId) && userId > 0) {
      await api(`/api/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showFeedback('Utilisateur mis a jour.');
    } else {
      await api('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showFeedback('Utilisateur cree.');
    }

    await loadUsers();
    resetForm();
  } catch (err) {
    showFeedback(err.message, true);
  } finally {
    dom.saveBtn.disabled = false;
    dom.saveBtn.textContent = 'Enregistrer';
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (_) {
    // noop
  }
  window.location.replace('/admin-login');
}

function bindEvents() {
  dom.form.addEventListener('submit', submitForm);
  dom.resetBtn.addEventListener('click', resetForm);
  dom.refreshBtn.addEventListener('click', loadUsers);
  dom.logoutBtn.addEventListener('click', logout);

  dom.roleClient.addEventListener('change', applyRoleVisibility);
  dom.roleAuteur.addEventListener('change', applyRoleVisibility);
  dom.roleEditeur.addEventListener('change', applyRoleVisibility);

  dom.usersTableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="edit"]');
    if (!button) {
      return;
    }

    const userId = Number.parseInt(button.dataset.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    const user = findUserById(userId);
    if (user) {
      fillForm(user);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

async function init() {
  setupDom();
  bindEvents();
  resetForm();

  const ok = await ensureAdminAuth();
  if (!ok) {
    return;
  }

  await loadUsers();
}

init();
