function getNextUrl() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next || '/';
}

function showError(message) {
  const feedback = document.getElementById('feedback');
  feedback.hidden = false;
  feedback.textContent = message;
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
    throw new Error(data?.error || `Erreur API (${response.status})`);
  }

  return data;
}

async function ensureAlreadyLoggedAdmin() {
  try {
    const me = await api('/api/auth/me');
    if (me?.authenticated && me?.user?.is_admin) {
      window.location.replace(getNextUrl());
    }
  } catch (_) {
    // noop
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const submit = document.getElementById('submit');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  submit.disabled = true;
  submit.textContent = 'Connexion...';

  try {
    await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const me = await api('/api/auth/me');
    if (!me?.authenticated || !me?.user?.is_admin) {
      await api('/api/auth/logout', { method: 'POST' });
      throw new Error('Ce compte nest pas admin.');
    }

    window.location.replace(getNextUrl());
  } catch (err) {
    showError(err.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Se connecter';
  }
}

document.getElementById('login-form').addEventListener('submit', handleSubmit);
ensureAlreadyLoggedAdmin();
