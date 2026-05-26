require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bookpress',
  waitForConnections: true,
  connectionLimit: 10,
});

const TOKEN_COOKIE_NAME = 'bp_auth_token';
const JWT_SECRET = process.env.JWT_SECRET || 'bookpress_demo_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const allowedSelectOnly = /^\s*SELECT\s/i;
const bootstrapAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@bookpress.local');
const bootstrapAdminPassword = String(process.env.ADMIN_PASSWORD || 'ChangeMe123!').trim();

const adminEmails = new Set(
  String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .concat(bootstrapAdminEmail)
    .filter(Boolean),
);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isAdminEmail(email) {
  return adminEmails.has(normalizeEmail(email));
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'oui'].includes(value.trim().toLowerCase());
  }
  return false;
}

function readText(value) {
  return String(value || '').trim();
}

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw createHttpError(400, 'Le panier est vide.');
  }

  const grouped = new Map();
  for (const item of rawItems) {
    const idLivre = Number.parseInt(item?.id_livre, 10);
    const quantite = Number.parseInt(item?.quantite, 10);

    if (!Number.isInteger(idLivre) || idLivre <= 0) {
      throw createHttpError(400, 'Chaque ligne du panier doit contenir un id_livre valide.');
    }
    if (!Number.isInteger(quantite) || quantite <= 0) {
      throw createHttpError(400, 'Chaque ligne du panier doit contenir une quantite positive.');
    }

    grouped.set(idLivre, (grouped.get(idLivre) || 0) + quantite);
  }

  return [...grouped.entries()].map(([id_livre, quantite]) => ({ id_livre, quantite }));
}

function buildBooksFilters({ genre, search, idLivre }) {
  const filters = [];
  const params = [];

  if (genre) {
    filters.push('l.genre = ?');
    params.push(genre);
  }

  if (search) {
    filters.push('(l.titre LIKE ? OR l.isbn LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (idLivre) {
    filters.push('l.id_livre = ?');
    params.push(idLivre);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, params };
}

function signTokenPayload(user) {
  return {
    userId: user.id_utilisateur,
    email: normalizeEmail(user.email),
    isAdmin: isAdminEmail(user.email),
  };
}

function setAuthCookie(res, user) {
  const token = jwt.sign(signTokenPayload(user), JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

app.use((req, _, next) => {
  req.auth = null;

  const token = req.cookies?.[TOKEN_COOKIE_NAME];
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = {
      userId: Number.parseInt(decoded.userId, 10),
      email: normalizeEmail(decoded.email),
      isAdmin: parseBoolean(decoded.isAdmin) || isAdminEmail(decoded.email),
    };
  } catch (_) {
    req.auth = null;
  }

  next();
});

function requireAuth(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  if (!req.auth.isAdmin) {
    return res.status(403).json({ error: 'Acces reserve aux administrateurs.' });
  }
  return next();
}

async function loadRoleFlags(connection, userId) {
  const [rows] = await connection.query(
    `
    SELECT
      EXISTS(SELECT 1 FROM CLIENT  WHERE id_utilisateur = ?) AS is_client,
      EXISTS(SELECT 1 FROM AUTEUR  WHERE id_utilisateur = ?) AS is_auteur,
      EXISTS(SELECT 1 FROM EDITEUR WHERE id_utilisateur = ?) AS is_editeur
    `,
    [userId, userId, userId],
  );

  const row = rows[0] || {};
  return {
    is_client: parseBoolean(row.is_client),
    is_auteur: parseBoolean(row.is_auteur),
    is_editeur: parseBoolean(row.is_editeur),
  };
}

async function loadAuthUserById(connection, userId) {
  const [rows] = await connection.query(
    `
    SELECT id_utilisateur, nom, prenom, email, adresse, telephone
    FROM UTILISATEUR
    WHERE id_utilisateur = ?
    LIMIT 1
    `,
    [userId],
  );

  if (!rows.length) {
    return null;
  }

  const user = rows[0];
  const roles = await loadRoleFlags(connection, user.id_utilisateur);

  return {
    id_utilisateur: user.id_utilisateur,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    adresse: user.adresse,
    telephone: user.telephone,
    ...roles,
    is_admin: isAdminEmail(user.email),
  };
}

async function ensureBootstrapAdmin() {
  const email = bootstrapAdminEmail;
  const password = bootstrapAdminPassword;

  if (!email || !password || password.length < 8) {
    return;
  }

  if (!adminEmails.has(email)) {
    adminEmails.add(email);
  }

  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.query(
      'SELECT id_utilisateur FROM UTILISATEUR WHERE email = ? LIMIT 1',
      [email],
    );

    if (existing.length) {
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await connection.query(
      `
      INSERT INTO UTILISATEUR (nom, prenom, email, mot_de_passe, adresse, telephone)
      VALUES ('Admin', 'BookPress', ?, ?, NULL, NULL)
      `,
      [email, hashed],
    );
  } finally {
    connection.release();
  }
}

app.get('/shop', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shop', 'index.html'));
});

app.get('/admin-login', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin/users', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-users.html'));
});

// Auth API
app.get('/api/auth/me', async (req, res) => {
  if (!req.auth?.userId) {
    return res.json({ authenticated: false });
  }

  const connection = await pool.getConnection();
  try {
    const user = await loadAuthUserById(connection, req.auth.userId);
    if (!user) {
      clearAuthCookie(res);
      return res.json({ authenticated: false });
    }
    return res.json({ authenticated: true, user });
  } finally {
    connection.release();
  }
});

app.post('/api/auth/register', async (req, res) => {
  const nom = readText(req.body?.nom);
  const prenom = readText(req.body?.prenom);
  const email = normalizeEmail(req.body?.email);
  const password = readText(req.body?.password);
  const telephone = readText(req.body?.telephone);
  const adresse = readText(req.body?.adresse);
  const adresseLivraison = readText(req.body?.adresse_livraison);

  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({ error: 'nom, prenom, email et password sont requis.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caracteres.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT id_utilisateur FROM UTILISATEUR WHERE email = ? LIMIT 1',
      [email],
    );

    if (existing.length) {
      throw createHttpError(409, 'Un compte existe deja avec cet email.');
    }

    const hashed = await bcrypt.hash(password, 10);

    const [insertUser] = await connection.query(
      `
      INSERT INTO UTILISATEUR (nom, prenom, email, mot_de_passe, adresse, telephone)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [nom, prenom, email, hashed, adresse || null, telephone || null],
    );

    await connection.query(
      'INSERT INTO CLIENT (id_utilisateur, adresse_livraison) VALUES (?, ?)',
      [insertUser.insertId, adresseLivraison || adresse || null],
    );

    const user = await loadAuthUserById(connection, insertUser.insertId);

    await connection.commit();
    setAuthCookie(res, user);

    return res.status(201).json({
      message: 'Compte cree. Vous etes connecte.',
      user,
    });
  } catch (err) {
    await connection.rollback();
    const status = err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500);
    return res.status(status).json({ error: err.message || 'Erreur serveur.' });
  } finally {
    connection.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = readText(req.body?.password);

  if (!email || !password) {
    return res.status(400).json({ error: 'email et password sont requis.' });
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
      SELECT id_utilisateur, nom, prenom, email, mot_de_passe
      FROM UTILISATEUR
      WHERE email = ?
      LIMIT 1
      `,
      [email],
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const user = rows[0];

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(password, user.mot_de_passe || '');
    } catch (_) {
      passwordOk = false;
    }

    if (!passwordOk) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const authUser = await loadAuthUserById(connection, user.id_utilisateur);
    setAuthCookie(res, authUser);

    return res.json({
      message: 'Connexion reussie.',
      user: authUser,
    });
  } finally {
    connection.release();
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Deconnexion effectuee.' });
});

// Public shop API
app.get('/api/shop/livres', async (req, res) => {
  const genre = readText(req.query.genre);
  const search = readText(req.query.q);

  const { whereClause, params } = buildBooksFilters({ genre, search });

  const [rows] = await pool.query(
    `
    SELECT l.id_livre, l.titre, l.isbn, l.genre, l.prix_unitaire,
           ed.nom_maison AS editeur,
           GROUP_CONCAT(DISTINCT CONCAT(u.prenom,' ',u.nom) SEPARATOR ', ') AS auteurs,
           COUNT(DISTINCT p.id_precommande) AS nb_precommandes
    FROM LIVRE l
    JOIN EDITEUR ed ON ed.id_utilisateur = l.id_editeur
    LEFT JOIN CONTRAT_REMUNERATION cr ON cr.id_livre = l.id_livre
    LEFT JOIN AUTEUR a ON a.id_utilisateur = cr.id_auteur
    LEFT JOIN UTILISATEUR u ON u.id_utilisateur = a.id_utilisateur
    LEFT JOIN PRECOMMANDE p ON p.id_livre = l.id_livre
    ${whereClause}
    GROUP BY l.id_livre
    ORDER BY l.titre
    `,
    params,
  );

  res.json(rows);
});

app.get('/api/shop/livres/:idLivre', async (req, res) => {
  const idLivre = Number.parseInt(req.params.idLivre, 10);
  if (!Number.isInteger(idLivre) || idLivre <= 0) {
    return res.status(400).json({ error: 'idLivre invalide.' });
  }

  const { whereClause, params } = buildBooksFilters({ idLivre });

  const [rows] = await pool.query(
    `
    SELECT l.id_livre, l.titre, l.isbn, l.genre, l.prix_unitaire,
           ed.nom_maison AS editeur,
           GROUP_CONCAT(DISTINCT CONCAT(u.prenom,' ',u.nom) SEPARATOR ', ') AS auteurs,
           COUNT(DISTINCT p.id_precommande) AS nb_precommandes
    FROM LIVRE l
    JOIN EDITEUR ed ON ed.id_utilisateur = l.id_editeur
    LEFT JOIN CONTRAT_REMUNERATION cr ON cr.id_livre = l.id_livre
    LEFT JOIN AUTEUR a ON a.id_utilisateur = cr.id_auteur
    LEFT JOIN UTILISATEUR u ON u.id_utilisateur = a.id_utilisateur
    LEFT JOIN PRECOMMANDE p ON p.id_livre = l.id_livre
    ${whereClause}
    GROUP BY l.id_livre
    LIMIT 1
    `,
    params,
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Livre introuvable.' });
  }

  res.json(rows[0]);
});

app.get('/api/shop/genres', async (_, res) => {
  const [rows] = await pool.query('SELECT DISTINCT genre FROM LIVRE WHERE genre IS NOT NULL ORDER BY genre');
  res.json(rows.map((row) => row.genre));
});

app.post('/api/precommandes', requireAuth, async (req, res) => {
  const items = normalizeOrderItems(req.body?.items);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [clientRows] = await connection.query(
      'SELECT id_utilisateur FROM CLIENT WHERE id_utilisateur = ? LIMIT 1',
      [req.auth.userId],
    );

    if (!clientRows.length) {
      throw createHttpError(403, 'Votre compte ne possede pas le role client.');
    }

    const placeholders = items.map(() => '?').join(',');
    const [books] = await connection.query(
      `SELECT id_livre, titre, prix_unitaire FROM LIVRE WHERE id_livre IN (${placeholders})`,
      items.map((item) => item.id_livre),
    );

    const bookMap = new Map(books.map((book) => [book.id_livre, book]));
    const missingIds = items
      .filter((item) => !bookMap.has(item.id_livre))
      .map((item) => item.id_livre);

    if (missingIds.length) {
      throw createHttpError(400, `Livre(s) introuvable(s): ${missingIds.join(', ')}`);
    }

    const createdPrecommandes = [];
    let totalMontant = 0;

    for (const item of items) {
      const book = bookMap.get(item.id_livre);
      const prixUnitaire = Number.parseFloat(book.prix_unitaire);
      const montant = Number((prixUnitaire * item.quantite).toFixed(2));

      const [insertPrecommande] = await connection.query(
        "INSERT INTO PRECOMMANDE (id_client, id_livre, quantite, statut) VALUES (?, ?, ?, 'en_attente')",
        [req.auth.userId, item.id_livre, item.quantite],
      );

      createdPrecommandes.push({
        id_precommande: insertPrecommande.insertId,
        id_livre: item.id_livre,
        titre: book.titre,
        quantite: item.quantite,
        prix_unitaire: prixUnitaire,
        montant,
        statut: 'en_attente',
      });

      totalMontant += montant;
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Precommandes enregistrees.',
      client_id: req.auth.userId,
      total_montant: Number(totalMontant.toFixed(2)),
      devise: 'EUR',
      precommandes: createdPrecommandes,
    });
  } catch (err) {
    await connection.rollback();
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Erreur serveur.' });
  } finally {
    connection.release();
  }
});

// Admin users and roles
app.get('/api/admin/users', requireAdmin, async (_, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.adresse,
           (c.id_utilisateur IS NOT NULL) AS is_client,
           c.adresse_livraison,
           (a.id_utilisateur IS NOT NULL) AS is_auteur,
           a.bio,
           a.iban,
           (e.id_utilisateur IS NOT NULL) AS is_editeur,
           e.siret,
           e.nom_maison
    FROM UTILISATEUR u
    LEFT JOIN CLIENT c ON c.id_utilisateur = u.id_utilisateur
    LEFT JOIN AUTEUR a ON a.id_utilisateur = u.id_utilisateur
    LEFT JOIN EDITEUR e ON e.id_utilisateur = u.id_utilisateur
    ORDER BY u.nom, u.prenom, u.id_utilisateur
  `);

  res.json(
    rows.map((row) => ({
      ...row,
      is_client: parseBoolean(row.is_client),
      is_auteur: parseBoolean(row.is_auteur),
      is_editeur: parseBoolean(row.is_editeur),
      is_admin: isAdminEmail(row.email),
    })),
  );
});

function parseUserManagementPayload(body, isCreate) {
  const nom = readText(body?.nom);
  const prenom = readText(body?.prenom);
  const email = normalizeEmail(body?.email);
  const telephone = readText(body?.telephone);
  const adresse = readText(body?.adresse);
  const password = readText(body?.password);

  const roles = {
    client: parseBoolean(body?.roles?.client),
    auteur: parseBoolean(body?.roles?.auteur),
    editeur: parseBoolean(body?.roles?.editeur),
  };

  const details = {
    adresse_livraison: readText(body?.details?.adresse_livraison),
    bio: readText(body?.details?.bio),
    iban: readText(body?.details?.iban),
    siret: readText(body?.details?.siret),
    nom_maison: readText(body?.details?.nom_maison),
  };

  if (!nom || !prenom || !email) {
    throw createHttpError(400, 'nom, prenom et email sont requis.');
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError(400, 'Email invalide.');
  }

  if (isCreate && !password) {
    throw createHttpError(400, 'password requis pour la creation.');
  }

  if (password && password.length < 8) {
    throw createHttpError(400, 'Le mot de passe doit contenir au moins 8 caracteres.');
  }

  if (!roles.client && !roles.auteur && !roles.editeur) {
    throw createHttpError(400, 'Selectionnez au moins un role (client, auteur ou editeur).');
  }

  if (roles.auteur && !details.iban) {
    throw createHttpError(400, 'Le role auteur requiert un IBAN.');
  }

  if (roles.editeur && (!details.siret || !details.nom_maison)) {
    throw createHttpError(400, 'Le role editeur requiert un SIRET et un nom de maison.');
  }

  return {
    nom,
    prenom,
    email,
    telephone,
    adresse,
    password,
    roles,
    details,
  };
}

async function syncClientRole(connection, userId, shouldHaveRole, details, fallbackAddress) {
  const [rows] = await connection.query(
    'SELECT id_utilisateur FROM CLIENT WHERE id_utilisateur = ? LIMIT 1',
    [userId],
  );
  const exists = rows.length > 0;

  if (shouldHaveRole) {
    const shippingAddress = details.adresse_livraison || fallbackAddress || null;
    if (exists) {
      await connection.query('UPDATE CLIENT SET adresse_livraison = ? WHERE id_utilisateur = ?', [shippingAddress, userId]);
    } else {
      await connection.query('INSERT INTO CLIENT (id_utilisateur, adresse_livraison) VALUES (?, ?)', [userId, shippingAddress]);
    }
    return;
  }

  if (exists) {
    await connection.query('DELETE FROM CLIENT WHERE id_utilisateur = ?', [userId]);
  }
}

async function syncAuteurRole(connection, userId, shouldHaveRole, details) {
  const [rows] = await connection.query(
    'SELECT id_utilisateur FROM AUTEUR WHERE id_utilisateur = ? LIMIT 1',
    [userId],
  );
  const exists = rows.length > 0;

  if (shouldHaveRole) {
    if (exists) {
      await connection.query('UPDATE AUTEUR SET bio = ?, iban = ? WHERE id_utilisateur = ?', [details.bio || null, details.iban, userId]);
    } else {
      await connection.query('INSERT INTO AUTEUR (id_utilisateur, bio, iban) VALUES (?, ?, ?)', [userId, details.bio || null, details.iban]);
    }
    return;
  }

  if (exists) {
    await connection.query('DELETE FROM AUTEUR WHERE id_utilisateur = ?', [userId]);
  }
}

async function syncEditeurRole(connection, userId, shouldHaveRole, details) {
  const [rows] = await connection.query(
    'SELECT id_utilisateur FROM EDITEUR WHERE id_utilisateur = ? LIMIT 1',
    [userId],
  );
  const exists = rows.length > 0;

  if (shouldHaveRole) {
    if (exists) {
      await connection.query('UPDATE EDITEUR SET siret = ?, nom_maison = ? WHERE id_utilisateur = ?', [details.siret, details.nom_maison, userId]);
    } else {
      await connection.query('INSERT INTO EDITEUR (id_utilisateur, siret, nom_maison) VALUES (?, ?, ?)', [userId, details.siret, details.nom_maison]);
    }
    return;
  }

  if (exists) {
    await connection.query('DELETE FROM EDITEUR WHERE id_utilisateur = ?', [userId]);
  }
}

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const payload = parseUserManagementPayload(req.body, true);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT id_utilisateur FROM UTILISATEUR WHERE email = ? LIMIT 1', [payload.email]);
    if (existing.length) {
      throw createHttpError(409, 'Cet email existe deja.');
    }

    const hashed = await bcrypt.hash(payload.password, 10);

    const [insertUser] = await connection.query(
      `
      INSERT INTO UTILISATEUR (nom, prenom, email, mot_de_passe, adresse, telephone)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [payload.nom, payload.prenom, payload.email, hashed, payload.adresse || null, payload.telephone || null],
    );

    const userId = insertUser.insertId;

    await syncClientRole(connection, userId, payload.roles.client, payload.details, payload.adresse);
    await syncAuteurRole(connection, userId, payload.roles.auteur, payload.details);
    await syncEditeurRole(connection, userId, payload.roles.editeur, payload.details);

    await connection.commit();

    const [created] = await pool.query(
      `
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.adresse,
             (c.id_utilisateur IS NOT NULL) AS is_client,
             c.adresse_livraison,
             (a.id_utilisateur IS NOT NULL) AS is_auteur,
             a.bio,
             a.iban,
             (e.id_utilisateur IS NOT NULL) AS is_editeur,
             e.siret,
             e.nom_maison
      FROM UTILISATEUR u
      LEFT JOIN CLIENT c ON c.id_utilisateur = u.id_utilisateur
      LEFT JOIN AUTEUR a ON a.id_utilisateur = u.id_utilisateur
      LEFT JOIN EDITEUR e ON e.id_utilisateur = u.id_utilisateur
      WHERE u.id_utilisateur = ?
      LIMIT 1
      `,
      [userId],
    );

    const user = created[0];
    return res.status(201).json({
      message: 'Utilisateur cree.',
      user: {
        ...user,
        is_client: parseBoolean(user.is_client),
        is_auteur: parseBoolean(user.is_auteur),
        is_editeur: parseBoolean(user.is_editeur),
        is_admin: isAdminEmail(user.email),
      },
    });
  } catch (err) {
    await connection.rollback();
    const duplicate = err.code === 'ER_DUP_ENTRY';
    const referenced = err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED';
    const status = err.status || (duplicate || referenced ? 409 : 500);
    const message = referenced
      ? 'Impossible de retirer ce role car des donnees liees existent deja.'
      : err.message || 'Erreur serveur.';
    return res.status(status).json({ error: message });
  } finally {
    connection.release();
  }
});

app.put('/api/admin/users/:idUtilisateur/roles', requireAdmin, async (req, res) => {
  const userId = Number.parseInt(req.params.idUtilisateur, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'idUtilisateur invalide.' });
  }

  const payload = parseUserManagementPayload(req.body, false);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.query('SELECT id_utilisateur FROM UTILISATEUR WHERE id_utilisateur = ? LIMIT 1', [userId]);
    if (!existingUsers.length) {
      throw createHttpError(404, 'Utilisateur introuvable.');
    }

    const [emailOwner] = await connection.query(
      'SELECT id_utilisateur FROM UTILISATEUR WHERE email = ? AND id_utilisateur <> ? LIMIT 1',
      [payload.email, userId],
    );
    if (emailOwner.length) {
      throw createHttpError(409, 'Cet email est deja utilise par un autre utilisateur.');
    }

    const updateFields = [
      payload.nom,
      payload.prenom,
      payload.email,
      payload.adresse || null,
      payload.telephone || null,
    ];

    let updateQuery = 'UPDATE UTILISATEUR SET nom = ?, prenom = ?, email = ?, adresse = ?, telephone = ?';

    if (payload.password) {
      const hashed = await bcrypt.hash(payload.password, 10);
      updateQuery += ', mot_de_passe = ?';
      updateFields.push(hashed);
    }

    updateQuery += ' WHERE id_utilisateur = ?';
    updateFields.push(userId);

    await connection.query(updateQuery, updateFields);

    await syncClientRole(connection, userId, payload.roles.client, payload.details, payload.adresse);
    await syncAuteurRole(connection, userId, payload.roles.auteur, payload.details);
    await syncEditeurRole(connection, userId, payload.roles.editeur, payload.details);

    await connection.commit();

    const [updatedRows] = await pool.query(
      `
      SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.adresse,
             (c.id_utilisateur IS NOT NULL) AS is_client,
             c.adresse_livraison,
             (a.id_utilisateur IS NOT NULL) AS is_auteur,
             a.bio,
             a.iban,
             (e.id_utilisateur IS NOT NULL) AS is_editeur,
             e.siret,
             e.nom_maison
      FROM UTILISATEUR u
      LEFT JOIN CLIENT c ON c.id_utilisateur = u.id_utilisateur
      LEFT JOIN AUTEUR a ON a.id_utilisateur = u.id_utilisateur
      LEFT JOIN EDITEUR e ON e.id_utilisateur = u.id_utilisateur
      WHERE u.id_utilisateur = ?
      LIMIT 1
      `,
      [userId],
    );

    const user = updatedRows[0];
    return res.json({
      message: 'Utilisateur mis a jour.',
      user: {
        ...user,
        is_client: parseBoolean(user.is_client),
        is_auteur: parseBoolean(user.is_auteur),
        is_editeur: parseBoolean(user.is_editeur),
        is_admin: isAdminEmail(user.email),
      },
    });
  } catch (err) {
    await connection.rollback();
    const duplicate = err.code === 'ER_DUP_ENTRY';
    const referenced = err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED';
    const status = err.status || (duplicate || referenced ? 409 : 500);
    const message = referenced
      ? 'Impossible de retirer ce role car des donnees liees existent deja.'
      : err.message || 'Erreur serveur.';
    return res.status(status).json({ error: message });
  } finally {
    connection.release();
  }
});

// Admin API
app.get('/api/kpis', requireAdmin, async (_, res) => {
  const [[livres]] = await pool.query('SELECT COUNT(*) n FROM LIVRE');
  const [[auteurs]] = await pool.query('SELECT COUNT(*) n FROM AUTEUR');
  const [[clients]] = await pool.query('SELECT COUNT(*) n FROM CLIENT');
  const [[ventes]] = await pool.query('SELECT COALESCE(SUM(montant_total),0) n FROM VENTE');
  const [[cmds]] = await pool.query('SELECT COUNT(*) n FROM PRECOMMANDE');
  const [[batches]] = await pool.query("SELECT COUNT(*) n FROM BATCH_IMPRESSION WHERE statut='en_cours'");
  res.json({
    livres: livres.n,
    auteurs: auteurs.n,
    clients: clients.n,
    chiffre_affaires: Number.parseFloat(ventes.n).toFixed(2),
    commandes: cmds.n,
    batches_actifs: batches.n,
  });
});

app.get('/api/livres', requireAdmin, async (req, res) => {
  const genre = req.query.genre;
  let query = `
    SELECT l.id_livre, l.titre, l.isbn, l.genre, l.prix_unitaire,
           ed.nom_maison AS editeur,
           GROUP_CONCAT(DISTINCT CONCAT(u.prenom,' ',u.nom) SEPARATOR ', ') AS auteurs,
           COUNT(DISTINCT p.id_precommande) AS nb_precommandes
    FROM LIVRE l
    JOIN EDITEUR ed ON ed.id_utilisateur = l.id_editeur
    LEFT JOIN CONTRAT_REMUNERATION cr ON cr.id_livre = l.id_livre
    LEFT JOIN AUTEUR a ON a.id_utilisateur = cr.id_auteur
    LEFT JOIN UTILISATEUR u ON u.id_utilisateur = a.id_utilisateur
    LEFT JOIN PRECOMMANDE p ON p.id_livre = l.id_livre
  `;
  const params = [];
  if (genre) {
    query += ' WHERE l.genre = ?';
    params.push(genre);
  }
  query += ' GROUP BY l.id_livre ORDER BY nb_precommandes DESC';
  const [rows] = await pool.query(query, params);
  res.json(rows);
});

app.get('/api/genres', requireAdmin, async (_, res) => {
  const [rows] = await pool.query('SELECT DISTINCT genre FROM LIVRE ORDER BY genre');
  res.json(rows.map((row) => row.genre));
});

app.get('/api/auteurs', requireAdmin, async (_, res) => {
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

app.get('/api/commandes', requireAdmin, async (req, res) => {
  const statut = req.query.statut;
  let query = `
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
  if (statut) {
    query += ' WHERE p.statut = ?';
    params.push(statut);
  }
  query += ' ORDER BY p.date_commande DESC LIMIT 100';
  const [rows] = await pool.query(query, params);
  res.json(rows);
});

app.get('/api/batches', requireAdmin, async (_, res) => {
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

app.get('/api/stats/genres', requireAdmin, async (_, res) => {
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

app.get('/api/stats/semaines', requireAdmin, async (_, res) => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(v.date_vente, '%Y-%u') AS semaine,
           COUNT(*) AS nb_ventes,
           SUM(v.montant_total) AS ca
    FROM VENTE v
    GROUP BY semaine ORDER BY semaine
  `);
  res.json(rows);
});

app.post('/api/query', requireAdmin, async (req, res) => {
  const { sql } = req.body;
  if (!sql || !allowedSelectOnly.test(sql)) {
    return res.status(400).json({ error: 'Seules les requetes SELECT sont autorisees.' });
  }
  try {
    const [rows, fields] = await pool.query(sql);
    return res.json({ rows, columns: fields.map((field) => field.name) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

ensureBootstrapAdmin()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BookPress -> http://localhost:${PORT}`);
      console.log(`Shop public -> http://localhost:${PORT}/shop`);
      console.log(`Admin login -> http://localhost:${PORT}/admin-login`);
    });
  })
  .catch((err) => {
    console.error('Echec bootstrap admin:', err.message);
    process.exit(1);
  });
