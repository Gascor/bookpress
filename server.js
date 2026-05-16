require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'bookpress',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── KPIs ────────────────────────────────────────────────
app.get('/api/kpis', async (_, res) => {
  const [[livres]]   = await pool.query('SELECT COUNT(*) n FROM LIVRE');
  const [[auteurs]]  = await pool.query('SELECT COUNT(*) n FROM AUTEUR');
  const [[clients]]  = await pool.query('SELECT COUNT(*) n FROM CLIENT');
  const [[ventes]]   = await pool.query('SELECT COALESCE(SUM(montant_total),0) n FROM VENTE');
  const [[cmds]]     = await pool.query('SELECT COUNT(*) n FROM PRECOMMANDE');
  const [[batches]]  = await pool.query("SELECT COUNT(*) n FROM BATCH_IMPRESSION WHERE statut='en_cours'");
  res.json({
    livres: livres.n, auteurs: auteurs.n, clients: clients.n,
    chiffre_affaires: parseFloat(ventes.n).toFixed(2),
    commandes: cmds.n, batches_actifs: batches.n,
  });
});

// ── LIVRES ───────────────────────────────────────────────
app.get('/api/livres', async (req, res) => {
  const genre = req.query.genre;
  let q = `
    SELECT l.id_livre, l.titre, l.isbn, l.genre, l.prix_unitaire,
           e.nom_maison AS editeur,
           GROUP_CONCAT(DISTINCT CONCAT(u.prenom,' ',u.nom) SEPARATOR ', ') AS auteurs,
           COUNT(DISTINCT p.id_precommande) AS nb_precommandes
    FROM LIVRE l
    JOIN EDITEUR ed ON ed.id_utilisateur = l.id_editeur
    JOIN UTILISATEUR e ON e.id_utilisateur = ed.id_utilisateur
    LEFT JOIN CONTRAT_REMUNERATION cr ON cr.id_livre = l.id_livre
    LEFT JOIN AUTEUR a ON a.id_utilisateur = cr.id_auteur
    LEFT JOIN UTILISATEUR u ON u.id_utilisateur = a.id_utilisateur
    LEFT JOIN PRECOMMANDE p ON p.id_livre = l.id_livre
  `;
  const params = [];
  if (genre) { q += ' WHERE l.genre = ?'; params.push(genre); }
  q += ' GROUP BY l.id_livre ORDER BY nb_precommandes DESC';
  const [rows] = await pool.query(q, params);
  res.json(rows);
});

app.get('/api/genres', async (_, res) => {
  const [rows] = await pool.query('SELECT DISTINCT genre FROM LIVRE ORDER BY genre');
  res.json(rows.map(r => r.genre));
});

// ── AUTEURS ──────────────────────────────────────────────
app.get('/api/auteurs', async (_, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_utilisateur, u.prenom, u.nom, a.bio,
           COUNT(DISTINCT cr.id_livre) AS nb_livres,
           COALESCE(SUM(v.montant_total * cr.pourcentage_auteur / 100), 0) AS revenus
    FROM AUTEUR a
    JOIN UTILISATEUR u ON u.id_utilisateur = a.id_utilisateur
    LEFT JOIN CONTRAT_REMUNERATION cr ON cr.id_auteur = a.id_utilisateur
    LEFT JOIN PRECOMMANDE p ON p.id_livre = cr.id_livre
    LEFT JOIN VENTE v ON v.id_precommande = p.id_precommande
    GROUP BY a.id_utilisateur
    ORDER BY revenus DESC
  `);
  res.json(rows);
});

// ── COMMANDES ────────────────────────────────────────────
app.get('/api/commandes', async (req, res) => {
  const statut = req.query.statut;
  let q = `
    SELECT p.id_precommande, p.date_commande, p.statut, p.quantite,
           CONCAT(u.prenom,' ',u.nom) AS client,
           l.titre AS livre, l.prix_unitaire,
           (p.quantite * l.prix_unitaire) AS montant,
           e.numero_suivi, t.nom AS transporteur
    FROM PRECOMMANDE p
    JOIN CLIENT c ON c.id_utilisateur = p.id_client
    JOIN UTILISATEUR u ON u.id_utilisateur = c.id_utilisateur
    JOIN LIVRE l ON l.id_livre = p.id_livre
    LEFT JOIN EXPEDITION e ON e.id_precommande = p.id_precommande
    LEFT JOIN TRANSPORTEUR t ON t.id_transporteur = e.id_transporteur
  `;
  const params = [];
  if (statut) { q += ' WHERE p.statut = ?'; params.push(statut); }
  q += ' ORDER BY p.date_commande DESC LIMIT 100';
  const [rows] = await pool.query(q, params);
  res.json(rows);
});

// ── BATCHES ──────────────────────────────────────────────
app.get('/api/batches', async (_, res) => {
  const [rows] = await pool.query(`
    SELECT b.id_batch, b.date_prevue, b.statut,
           COUNT(DISTINCT lb.id_livre) AS nb_titres,
           COALESCE(SUM(lb.quantite_totale), 0) AS total_exemplaires
    FROM BATCH_IMPRESSION b
    LEFT JOIN LIGNE_BATCH lb ON lb.id_batch = b.id_batch
    GROUP BY b.id_batch
    ORDER BY b.date_prevue DESC
  `);
  res.json(rows);
});

// ── VENTES PAR GENRE (chart) ─────────────────────────────
app.get('/api/stats/genres', async (_, res) => {
  const [rows] = await pool.query(`
    SELECT l.genre, COUNT(p.id_precommande) AS commandes,
           COALESCE(SUM(v.montant_total), 0) AS ca
    FROM LIVRE l
    LEFT JOIN PRECOMMANDE p ON p.id_livre = l.id_livre
    LEFT JOIN VENTE v ON v.id_precommande = p.id_precommande
    GROUP BY l.genre ORDER BY ca DESC
  `);
  res.json(rows);
});

// ── VENTES PAR SEMAINE (chart) ───────────────────────────
app.get('/api/stats/semaines', async (_, res) => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(v.date_vente, '%Y-%u') AS semaine,
           COUNT(*) AS nb_ventes,
           SUM(v.montant_total) AS ca
    FROM VENTE v
    GROUP BY semaine ORDER BY semaine
  `);
  res.json(rows);
});

// ── SQL EXPLORER ─────────────────────────────────────────
const ALLOWED = /^\s*SELECT\s/i;
app.post('/api/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql || !ALLOWED.test(sql))
    return res.status(400).json({ error: 'Seules les requêtes SELECT sont autorisées.' });
  try {
    const [rows, fields] = await pool.query(sql);
    res.json({ rows, columns: fields.map(f => f.name) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n📚 BookPress → http://localhost:${PORT}\n`));
