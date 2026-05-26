const STORAGE_KEY = 'bookpress_shop_cart_v1';

const state = {
  books: [],
  cart: loadCart(),
  filters: {
    q: '',
    genre: '',
  },
  auth: {
    authenticated: false,
    user: null,
  },
  submittingCheckout: false,
  submittingLogin: false,
  submittingRegister: false,
};

const dom = {};

function setupDom() {
  dom.searchInput = document.getElementById('search-input');
  dom.genreFilter = document.getElementById('genre-filter');
  dom.resetFiltersBtn = document.getElementById('reset-filters');
  dom.catalogStatus = document.getElementById('catalog-status');
  dom.booksGrid = document.getElementById('books-grid');

  dom.cartItems = document.getElementById('cart-items');
  dom.cartTotal = document.getElementById('cart-total');
  dom.cartCount = document.getElementById('cart-count');
  dom.goCheckoutBtn = document.getElementById('go-checkout');

  dom.accountStatus = document.getElementById('account-status');
  dom.logoutBtn = document.getElementById('logout-btn');

  dom.loginForm = document.getElementById('login-form');
  dom.loginSubmit = document.getElementById('login-submit');
  dom.loginEmail = document.getElementById('login-email');
  dom.loginPassword = document.getElementById('login-password');

  dom.registerForm = document.getElementById('register-form');
  dom.registerSubmit = document.getElementById('register-submit');
  dom.regNom = document.getElementById('reg-nom');
  dom.regPrenom = document.getElementById('reg-prenom');
  dom.regEmail = document.getElementById('reg-email');
  dom.regPassword = document.getElementById('reg-password');
  dom.regTelephone = document.getElementById('reg-telephone');
  dom.regAdresse = document.getElementById('reg-adresse');
  dom.regAdresseLivraison = document.getElementById('reg-adresse-livraison');

  dom.checkoutForm = document.getElementById('checkout-form');
  dom.checkoutSubmit = document.getElementById('checkout-submit');
  dom.checkoutAuthHint = document.getElementById('checkout-auth-hint');
  dom.checkoutFeedback = document.getElementById('checkout-feedback');

  dom.bookDialog = document.getElementById('book-dialog');
  dom.closeDialog = document.getElementById('close-dialog');
  dom.dialogContent = document.getElementById('dialog-content');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoney(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id_livre: Number.parseInt(item.id_livre, 10),
        quantite: Number.parseInt(item.quantite, 10),
        titre: String(item.titre || ''),
        prix_unitaire: Number(item.prix_unitaire) || 0,
      }))
      .filter((item) => Number.isInteger(item.id_livre) && item.id_livre > 0 && Number.isInteger(item.quantite) && item.quantite > 0);
  } catch (_) {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  } catch (_) {
    // Ignore storage failures (private mode, quota exceeded).
  }
}

function cartItemCount() {
  return state.cart.reduce((sum, item) => sum + item.quantite, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.quantite * item.prix_unitaire, 0);
}

function setCatalogStatus(text) {
  dom.catalogStatus.textContent = text;
}

function setFeedback(type, html) {
  dom.checkoutFeedback.classList.remove('hidden', 'success', 'error');
  dom.checkoutFeedback.classList.add(type);
  dom.checkoutFeedback.innerHTML = html;
}

function clearFeedback() {
  dom.checkoutFeedback.classList.add('hidden');
  dom.checkoutFeedback.classList.remove('success', 'error');
  dom.checkoutFeedback.innerHTML = '';
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

function userCanCheckout() {
  return Boolean(state.auth.authenticated && state.auth.user?.is_client);
}

function updateAuthUi() {
  const user = state.auth.user;

  if (!state.auth.authenticated || !user) {
    dom.accountStatus.textContent = 'Visiteur non connecte';
    dom.logoutBtn.hidden = true;

    dom.loginForm.classList.remove('hidden');
    dom.registerForm.classList.remove('hidden');
    dom.checkoutAuthHint.textContent = 'Connectez-vous pour confirmer la commande.';
    return;
  }

  const roleParts = [];
  if (user.is_client) roleParts.push('client');
  if (user.is_auteur) roleParts.push('auteur');
  if (user.is_editeur) roleParts.push('editeur');
  if (user.is_admin) roleParts.push('admin');

  dom.accountStatus.textContent = `${user.prenom} ${user.nom} (${roleParts.join(', ')})`;
  dom.logoutBtn.hidden = false;

  dom.loginForm.classList.add('hidden');
  dom.registerForm.classList.add('hidden');

  if (user.is_client) {
    dom.checkoutAuthHint.textContent = `Connecte en tant que client: ${user.prenom} ${user.nom}.`;
  } else {
    dom.checkoutAuthHint.textContent = 'Votre compte n\'a pas le role client. Contactez un administrateur.';
  }
}

function renderCheckoutState() {
  const hasCart = state.cart.length > 0;
  const canCheckout = userCanCheckout();

  dom.checkoutSubmit.disabled = !hasCart || !canCheckout || state.submittingCheckout;
}

async function refreshAuth() {
  try {
    const data = await api('/api/auth/me');
    state.auth.authenticated = Boolean(data?.authenticated);
    state.auth.user = data?.authenticated ? data.user : null;
  } catch (_) {
    state.auth.authenticated = false;
    state.auth.user = null;
  }

  updateAuthUi();
  renderCheckoutState();
}

async function loadGenres() {
  const genres = await api('/api/shop/genres');
  dom.genreFilter.innerHTML = '<option value="">Tous les genres</option>';

  genres.forEach((genre) => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    dom.genreFilter.appendChild(option);
  });
}

async function loadBooks() {
  const query = new URLSearchParams();
  if (state.filters.q) {
    query.set('q', state.filters.q);
  }
  if (state.filters.genre) {
    query.set('genre', state.filters.genre);
  }

  const endpoint = query.toString() ? `/api/shop/livres?${query}` : '/api/shop/livres';
  setCatalogStatus('Chargement du catalogue...');

  try {
    const books = await api(endpoint);
    state.books = books.map((book) => ({
      ...book,
      id_livre: Number(book.id_livre),
      prix_unitaire: Number(book.prix_unitaire),
      nb_precommandes: Number(book.nb_precommandes) || 0,
    }));

    renderBooks();
    setCatalogStatus(`${state.books.length} livre(s) affiches`);
  } catch (err) {
    state.books = [];
    renderBooks();
    setCatalogStatus(`Erreur catalogue: ${err.message}`);
  }
}

function findBookById(idLivre) {
  return state.books.find((book) => book.id_livre === idLivre) || null;
}

function addToCart(book, qty = 1) {
  const idLivre = Number(book.id_livre);
  if (!Number.isInteger(idLivre) || idLivre <= 0) {
    return;
  }

  const existing = state.cart.find((item) => item.id_livre === idLivre);
  if (existing) {
    existing.quantite += qty;
    existing.prix_unitaire = Number(book.prix_unitaire) || existing.prix_unitaire;
    existing.titre = String(book.titre || existing.titre);
  } else {
    state.cart.push({
      id_livre: idLivre,
      quantite: qty,
      titre: String(book.titre || `Livre #${idLivre}`),
      prix_unitaire: Number(book.prix_unitaire) || 0,
    });
  }

  saveCart();
  renderCart();
  renderBooks();
}

function setCartQuantity(idLivre, quantite) {
  const item = state.cart.find((cartItem) => cartItem.id_livre === idLivre);
  if (!item) {
    return;
  }

  if (quantite <= 0) {
    state.cart = state.cart.filter((cartItem) => cartItem.id_livre !== idLivre);
  } else {
    item.quantite = quantite;
  }

  saveCart();
  renderCart();
  renderBooks();
}

function renderBooks() {
  if (!state.books.length) {
    dom.booksGrid.innerHTML = '<article class="card-empty">Aucun livre ne correspond aux filtres en cours.</article>';
    return;
  }

  dom.booksGrid.innerHTML = state.books
    .map((book) => {
      const inCart = state.cart.find((item) => item.id_livre === book.id_livre);
      const inCartText = inCart ? `Deja dans le panier: ${inCart.quantite}` : 'Pas encore dans le panier';

      return `
      <article class="book-card" data-id="${book.id_livre}">
        <div class="book-top">
          <span class="book-genre">${escapeHtml(book.genre || 'Non classe')}</span>
          <h3 class="book-title">${escapeHtml(book.titre)}</h3>
          <div class="book-meta">${escapeHtml(book.auteurs || 'Auteur non renseigne')}</div>
          <div class="book-meta">Maison: ${escapeHtml(book.editeur || 'Inconnue')}</div>
          <div class="book-meta">ISBN: ${escapeHtml(book.isbn || 'N/A')}</div>
        </div>
        <div class="book-price">${formatMoney(book.prix_unitaire)}</div>
        <div class="book-meta">${inCartText}</div>
        <div class="book-actions">
          <button type="button" class="btn primary" data-action="add" data-id="${book.id_livre}">Ajouter</button>
          <button type="button" class="btn ghost" data-action="details" data-id="${book.id_livre}">Details</button>
        </div>
      </article>
      `;
    })
    .join('');
}

function renderCart() {
  const count = cartItemCount();
  dom.cartCount.textContent = String(count);
  dom.cartTotal.textContent = formatMoney(cartTotal());

  if (!state.cart.length) {
    dom.cartItems.innerHTML = '<div class="cart-empty">Le panier est vide.</div>';
    dom.goCheckoutBtn.disabled = true;
    renderCheckoutState();
    return;
  }

  dom.goCheckoutBtn.disabled = false;

  dom.cartItems.innerHTML = state.cart
    .map((item) => {
      const lineTotal = item.prix_unitaire * item.quantite;
      return `
      <article class="cart-item" data-id="${item.id_livre}">
        <p class="cart-item-title">${escapeHtml(item.titre)}</p>
        <div class="cart-item-line">
          <span>${formatMoney(item.prix_unitaire)} x ${item.quantite}</span>
          <strong>${formatMoney(lineTotal)}</strong>
        </div>
        <div class="cart-item-line">
          <div class="qty-row">
            <button type="button" data-action="dec" data-id="${item.id_livre}">-</button>
            <span>${item.quantite}</span>
            <button type="button" data-action="inc" data-id="${item.id_livre}">+</button>
          </div>
          <button type="button" class="remove-btn" data-action="remove" data-id="${item.id_livre}">Retirer</button>
        </div>
      </article>
      `;
    })
    .join('');

  renderCheckoutState();
}

async function openBookDialog(idLivre) {
  try {
    const book = await api(`/api/shop/livres/${idLivre}`);
    dom.dialogContent.innerHTML = `
      <section class="dialog-body" data-id="${book.id_livre}">
        <h3>${escapeHtml(book.titre)}</h3>
        <p><strong>Auteurs:</strong> ${escapeHtml(book.auteurs || 'Non renseigne')}</p>
        <p><strong>Editeur:</strong> ${escapeHtml(book.editeur || 'Inconnu')}</p>
        <div class="dialog-meta">
          <span><strong>ISBN:</strong> ${escapeHtml(book.isbn || 'N/A')}</span>
          <span><strong>Genre:</strong> ${escapeHtml(book.genre || 'Non classe')}</span>
          <span><strong>Prix:</strong> ${formatMoney(book.prix_unitaire)}</span>
          <span><strong>Precommandes historiques:</strong> ${Number(book.nb_precommandes) || 0}</span>
        </div>
        <button type="button" class="btn primary" data-action="add-dialog" data-id="${book.id_livre}">Ajouter ce livre au panier</button>
      </section>
    `;

    if (!dom.bookDialog.open) {
      dom.bookDialog.showModal();
    }
  } catch (err) {
    setFeedback('error', `<p class="feedback-title">${escapeHtml(err.message)}</p>`);
  }
}

function buildOrderPayload() {
  return {
    items: state.cart.map((item) => ({
      id_livre: item.id_livre,
      quantite: item.quantite,
    })),
  };
}

async function submitCheckout(event) {
  event.preventDefault();

  if (state.submittingCheckout) {
    return;
  }

  clearFeedback();

  if (!state.cart.length) {
    setFeedback('error', '<p class="feedback-title">Le panier est vide.</p>');
    return;
  }

  if (!userCanCheckout()) {
    setFeedback('error', '<p class="feedback-title">Connexion client requise pour commander.</p>');
    return;
  }

  state.submittingCheckout = true;
  renderCheckoutState();
  dom.checkoutSubmit.textContent = 'Validation en cours...';

  try {
    const result = await api('/api/precommandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOrderPayload()),
    });

    state.cart = [];
    saveCart();
    renderCart();
    renderBooks();

    const lines = (result.precommandes || [])
      .map(
        (row) =>
          `<li>#${row.id_precommande} - ${escapeHtml(row.titre)} x${row.quantite} (${formatMoney(row.montant)})</li>`,
      )
      .join('');

    setFeedback(
      'success',
      `
      <p class="feedback-title">Commande confirmee pour ${escapeHtml(state.auth.user.prenom)} ${escapeHtml(state.auth.user.nom)}.</p>
      <p>Total: <strong>${formatMoney(result.total_montant)}</strong></p>
      <ul class="feedback-list">${lines}</ul>
      `,
    );
  } catch (err) {
    if (err.status === 401) {
      await refreshAuth();
    }
    setFeedback('error', `<p class="feedback-title">Echec checkout: ${escapeHtml(err.message)}</p>`);
  } finally {
    state.submittingCheckout = false;
    dom.checkoutSubmit.textContent = 'Confirmer la precommande';
    renderCheckoutState();
  }
}

async function submitLogin(event) {
  event.preventDefault();
  if (state.submittingLogin) {
    return;
  }

  clearFeedback();
  state.submittingLogin = true;
  dom.loginSubmit.disabled = true;
  dom.loginSubmit.textContent = 'Connexion...';

  try {
    await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dom.loginEmail.value.trim(),
        password: dom.loginPassword.value,
      }),
    });

    dom.loginPassword.value = '';
    await refreshAuth();
    setFeedback('success', '<p class="feedback-title">Connexion reussie.</p>');
  } catch (err) {
    setFeedback('error', `<p class="feedback-title">Connexion impossible: ${escapeHtml(err.message)}</p>`);
  } finally {
    state.submittingLogin = false;
    dom.loginSubmit.disabled = false;
    dom.loginSubmit.textContent = 'Se connecter';
  }
}

async function submitRegister(event) {
  event.preventDefault();
  if (state.submittingRegister) {
    return;
  }

  clearFeedback();
  state.submittingRegister = true;
  dom.registerSubmit.disabled = true;
  dom.registerSubmit.textContent = 'Creation...';

  try {
    await api('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: dom.regNom.value.trim(),
        prenom: dom.regPrenom.value.trim(),
        email: dom.regEmail.value.trim(),
        password: dom.regPassword.value,
        telephone: dom.regTelephone.value.trim(),
        adresse: dom.regAdresse.value.trim(),
        adresse_livraison: dom.regAdresseLivraison.value.trim(),
      }),
    });

    dom.registerForm.reset();
    await refreshAuth();
    setFeedback('success', '<p class="feedback-title">Compte cree et connecte.</p>');
  } catch (err) {
    setFeedback('error', `<p class="feedback-title">Creation impossible: ${escapeHtml(err.message)}</p>`);
  } finally {
    state.submittingRegister = false;
    dom.registerSubmit.disabled = false;
    dom.registerSubmit.textContent = 'Creer mon compte';
  }
}

async function logout() {
  clearFeedback();
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (_) {
    // noop
  }

  state.auth.authenticated = false;
  state.auth.user = null;
  updateAuthUi();
  renderCheckoutState();
}

function debounce(fn, waitMs = 250) {
  let timerId = null;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), waitMs);
  };
}

function bindEvents() {
  const onSearchInput = debounce(async () => {
    state.filters.q = dom.searchInput.value.trim();
    await loadBooks();
  }, 280);

  dom.searchInput.addEventListener('input', onSearchInput);

  dom.genreFilter.addEventListener('change', async () => {
    state.filters.genre = dom.genreFilter.value;
    await loadBooks();
  });

  dom.resetFiltersBtn.addEventListener('click', async () => {
    dom.searchInput.value = '';
    dom.genreFilter.value = '';
    state.filters.q = '';
    state.filters.genre = '';
    await loadBooks();
  });

  dom.booksGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const idLivre = Number.parseInt(button.dataset.id, 10);
    if (!Number.isInteger(idLivre) || idLivre <= 0) {
      return;
    }

    if (action === 'add') {
      const book = findBookById(idLivre);
      if (book) {
        addToCart(book, 1);
      }
      return;
    }

    if (action === 'details') {
      await openBookDialog(idLivre);
    }
  });

  dom.cartItems.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const idLivre = Number.parseInt(button.dataset.id, 10);
    if (!Number.isInteger(idLivre) || idLivre <= 0) {
      return;
    }

    const item = state.cart.find((entry) => entry.id_livre === idLivre);
    if (!item) {
      return;
    }

    if (action === 'inc') {
      setCartQuantity(idLivre, item.quantite + 1);
    }
    if (action === 'dec') {
      setCartQuantity(idLivre, item.quantite - 1);
    }
    if (action === 'remove') {
      setCartQuantity(idLivre, 0);
    }
  });

  dom.goCheckoutBtn.addEventListener('click', () => {
    document.getElementById('checkout').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  dom.checkoutForm.addEventListener('submit', submitCheckout);
  dom.loginForm.addEventListener('submit', submitLogin);
  dom.registerForm.addEventListener('submit', submitRegister);
  dom.logoutBtn.addEventListener('click', logout);

  dom.closeDialog.addEventListener('click', () => {
    dom.bookDialog.close();
  });

  dom.dialogContent.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="add-dialog"]');
    if (!button) {
      return;
    }

    const idLivre = Number.parseInt(button.dataset.id, 10);
    if (!Number.isInteger(idLivre) || idLivre <= 0) {
      return;
    }

    const book = findBookById(idLivre);
    if (book) {
      addToCart(book, 1);
      dom.bookDialog.close();
    }
  });
}

async function init() {
  setupDom();
  bindEvents();
  renderCart();
  updateAuthUi();
  renderCheckoutState();

  await Promise.all([loadGenres(), loadBooks(), refreshAuth()]);
}

init();
