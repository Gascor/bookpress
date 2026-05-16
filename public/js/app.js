/* ── Navigation ─────────────────────────────────────── */
const pages = {};
document.querySelectorAll('.page').forEach(p => pages[p.id.replace('page-','')] = p);
const links = document.querySelectorAll('.nav-link');

function showPage(name) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  links.forEach(l => l.classList.remove('active'));
  pages[name]?.classList.add('active');
  document.querySelector(`[data-page="${name}"]`)?.classList.add('active');
  loaders[name]?.();
}

links.forEach(l => l.addEventListener('click', e => {
  e.preventDefault();
  showPage(l.dataset.page);
}));

/* ── Fetch helper ───────────────────────────────────── */
async function api(url) {
  const r = await fetch(url);
  return r.json();
}

/* ── Formatters ─────────────────────────────────────── */
const fmt = n => parseFloat(n).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const fmtInt = n => parseInt(n).toLocaleString('fr-FR');

function badge(statut) {
  return `<span class="badge badge-${statut}">${statut.replace('_',' ')}</span>`;
}

/* ── Dashboard ──────────────────────────────────────── */
let chartsBuilt = false;

async function loadDashboard() {
  const k = await api('/api/kpis');
  document.querySelector('#kpi-livres .kpi-val').textContent   = k.livres;
  document.querySelector('#kpi-auteurs .kpi-val').textContent  = k.auteurs;
  document.querySelector('#kpi-clients .kpi-val').textContent  = k.clients;
  document.querySelector('#kpi-ca .kpi-val').textContent       = fmt(k.chiffre_affaires) + ' €';
  document.querySelector('#kpi-cmds .kpi-val').textContent     = k.commandes;
  document.querySelector('#kpi-batch .kpi-val').textContent    = k.batches_actifs;

  if (chartsBuilt) return;
  chartsBuilt = true;

  const [genres, semaines] = await Promise.all([
    api('/api/stats/genres'),
    api('/api/stats/semaines'),
  ]);

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const COLORS = [
    '#c8a96e','#5b8fe8','#4caf82','#e85b5b','#e8c45b',
    '#a86ec8','#5bb8e8','#e8885b','#6ec8a8','#e85b8e',
  ];

  // Genres bar chart
  new Chart(document.getElementById('chart-genres'), {
    type: 'bar',
    data: {
      labels: genres.map(g => g.genre),
      datasets: [{
        data: genres.map(g => parseFloat(g.ca)),
        backgroundColor: genres.map((_, i) => COLORS[i % COLORS.length] + 'cc'),
        borderColor: genres.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ticks: { color: '#5a5856', font: { size: 11 } }, grid: { color: '#2a2a2e' } },
        y: { ticks: { color: '#5a5856', font: { size: 11 }, callback: v => v + ' €' }, grid: { color: '#2a2a2e' } },
      },
    },
  });

  // Semaines line chart
  new Chart(document.getElementById('chart-semaines'), {
    type: 'line',
    data: {
      labels: semaines.map(s => 'S' + s.semaine.split('-')[1]),
      datasets: [{
        data: semaines.map(s => parseFloat(s.ca)),
        borderColor: '#c8a96e',
        backgroundColor: 'rgba(200,169,110,.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#c8a96e',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ticks: { color: '#5a5856', font: { size: 11 } }, grid: { color: '#2a2a2e' } },
        y: { ticks: { color: '#5a5856', font: { size: 11 }, callback: v => v + ' €' }, grid: { color: '#2a2a2e' } },
      },
    },
  });
}

/* ── Livres ─────────────────────────────────────────── */
async function loadLivres(genre = '') {
  const tbody = document.querySelector('#table-livres tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Chargement…</td></tr>';
  const url = genre ? `/api/livres?genre=${encodeURIComponent(genre)}` : '/api/livres';
  const livres = await api(url);
  tbody.innerHTML = livres.map(l => `
    <tr>
      <td>${l.id_livre}</td>
      <td title="${l.titre}" style="max-width:200px;font-style:italic">${l.titre}</td>
      <td><span class="badge badge-confirmee" style="font-size:10px">${l.genre}</span></td>
      <td title="${l.auteurs || '—'}">${l.auteurs || '<span style="color:var(--text3)">—</span>'}</td>
      <td>${l.editeur}</td>
      <td style="font-family:var(--font-mono)">${fmt(l.prix_unitaire)} €</td>
      <td style="font-family:var(--font-mono);color:var(--accent)">${fmtInt(l.nb_precommandes)}</td>
    </tr>
  `).join('');
}

async function initLivres() {
  const genres = await api('/api/genres');
  const sel = document.getElementById('filter-genre');
  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => loadLivres(sel.value));
  loadLivres();
}

/* ── Auteurs ────────────────────────────────────────── */
async function loadAuteurs() {
  const grid = document.getElementById('auteurs-grid');
  grid.innerHTML = '<div class="loading">Chargement…</div>';
  const auteurs = await api('/api/auteurs');
  grid.innerHTML = auteurs.map((a, i) => `
    <div class="author-card">
      <div class="author-rank">${i + 1}</div>
      <div class="author-name">${a.prenom} ${a.nom}</div>
      <div class="author-bio">${a.bio || 'Aucune biographie.'}</div>
      <div class="author-stats">
        <div class="author-stat">
          <div class="author-stat-val">${fmt(a.revenus)} €</div>
          <div class="author-stat-label">Revenus</div>
        </div>
        <div class="author-stat">
          <div class="author-stat-val">${a.nb_livres}</div>
          <div class="author-stat-label">Livres</div>
        </div>
      </div>
    </div>
  `).join('');
}

/* ── Commandes ──────────────────────────────────────── */
async function loadCommandes(statut = '') {
  const tbody = document.querySelector('#table-commandes tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading">Chargement…</td></tr>';
  const url = statut ? `/api/commandes?statut=${statut}` : '/api/commandes';
  const rows = await api(url);
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id_precommande}</td>
      <td>${r.client}</td>
      <td title="${r.livre}" style="font-style:italic">${r.livre.length > 28 ? r.livre.slice(0,28)+'…' : r.livre}</td>
      <td style="font-family:var(--font-mono)">${r.quantite}</td>
      <td style="color:var(--text2)">${r.date_commande?.slice(0,10)}</td>
      <td style="font-family:var(--font-mono)">${fmt(r.montant)} €</td>
      <td>${badge(r.statut)}</td>
      <td style="color:var(--text2)">${r.transporteur || '<span style="color:var(--text3)">—</span>'}</td>
    </tr>
  `).join('');
}

function initCommandes() {
  document.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadCommandes(btn.dataset.statut);
    });
  });
  loadCommandes();
}

/* ── Batches ────────────────────────────────────────── */
async function loadBatches() {
  const tbody = document.querySelector('#table-batches tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Chargement…</td></tr>';
  const rows = await api('/api/batches');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id_batch}</td>
      <td>${r.date_prevue?.slice(0,10)}</td>
      <td>${badge(r.statut)}</td>
      <td style="font-family:var(--font-mono)">${r.nb_titres}</td>
      <td style="font-family:var(--font-mono);color:var(--accent)">${r.total_exemplaires}</td>
    </tr>
  `).join('');
}

/* ── SQL Explorer ───────────────────────────────────── */
function initSQL() {
  const editor  = document.getElementById('sql-editor');
  const runBtn  = document.getElementById('run-btn');
  const errDiv  = document.getElementById('sql-error');
  const resWrap = document.getElementById('sql-result-wrap');
  const resTable = document.getElementById('sql-result-table');
  const meta    = document.getElementById('sql-meta');

  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      editor.value = btn.dataset.q;
      runQuery();
    });
  });

  runBtn.addEventListener('click', runQuery);
  editor.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') runQuery();
  });

  async function runQuery() {
    const sql = editor.value.trim();
    if (!sql) return;
    errDiv.classList.add('hidden');
    resWrap.style.display = 'none';
    runBtn.textContent = '⏳';

    const t0 = Date.now();
    try {
      const data = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      }).then(r => r.json());

      if (data.error) {
        errDiv.textContent = data.error;
        errDiv.classList.remove('hidden');
      } else {
        const elapsed = Date.now() - t0;
        meta.textContent = `${data.rows.length} ligne(s) — ${elapsed}ms`;
        const thead = resTable.querySelector('thead');
        const tbody = resTable.querySelector('tbody');
        thead.innerHTML = '<tr>' + data.columns.map(c => `<th>${c}</th>`).join('') + '</tr>';
        tbody.innerHTML = data.rows.map(row =>
          '<tr>' + data.columns.map(c => {
            const v = row[c];
            if (v === null || v === undefined) return '<td style="color:var(--text3)">NULL</td>';
            return `<td>${v}</td>`;
          }).join('') + '</tr>'
        ).join('');
        resWrap.style.display = 'block';
      }
    } catch (e) {
      errDiv.textContent = 'Erreur réseau : ' + e.message;
      errDiv.classList.remove('hidden');
    }
    runBtn.textContent = '▶ Exécuter';
  }
}

/* ── Loaders (lazy) ─────────────────────────────────── */
const loaded = {};
const loaders = {
  dashboard: () => { if (!loaded.dashboard) { loaded.dashboard = true; loadDashboard(); } },
  livres:    () => { if (!loaded.livres)    { loaded.livres    = true; initLivres();    } },
  auteurs:   () => { if (!loaded.auteurs)   { loaded.auteurs   = true; loadAuteurs();   } },
  commandes: () => { if (!loaded.commandes) { loaded.commandes = true; initCommandes(); } },
  batches:   () => { if (!loaded.batches)   { loaded.batches   = true; loadBatches();   } },
  sql:       () => { if (!loaded.sql)       { loaded.sql       = true; initSQL();       } },
};

// Init
showPage('dashboard');
