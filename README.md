# BookPress - Demonstration BDD

Application web Node.js + Express + MySQL avec:
- back-office admin (dashboard)
- boutique publique (`/shop`)
- authentification (register/login/logout)
- gestion de roles (`client`, `auteur`, `editeur`) par admin

## Prerequis

- Node.js 18+
- MySQL 8+

## Installation

```bash
npm install
cp .env.example .env
npm run setup
npm start
```
**Note : npm start sert à lancer le projet. Le SGBD est MySQL 8**
**Note 2 : Liens vers la Présentation vidéo : https://www.youtube.com/watch?v=CEqawAO6lwg**

## Variables d'environnement

Fichier `.env`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PORT`
- `JWT_SECRET`, `JWT_EXPIRES`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (creation automatique du compte admin si absent)
- `ADMIN_EMAILS` (liste d'emails admin, separes par virgules)

Sans configuration explicite, un compte admin par defaut est bootstrappe:
- email: `admin@bookpress.local`
- mot de passe: `ChangeMe123!`

## URLs

- Admin dashboard: `http://localhost:3000/`
- Login admin: `http://localhost:3000/admin-login`
- Gestion utilisateurs/roles: `http://localhost:3000/admin/users`
- Shop public: `http://localhost:3000/shop`

## Fonctionnalites

### Shop public

- Catalogue livres (recherche + filtre genre)
- Fiche livre
- Panier multi-livres (`localStorage`)
- Creation de compte client
- Connexion / deconnexion
- Checkout authentifie (`POST /api/precommandes`)

### Admin

- Dashboard (KPIs, tableaux, stats, SQL explorer)
- Toutes les routes admin protegees (auth admin)
- CRUD utilisateur orientee roles:
  - creation utilisateur avec roles
  - edition utilisateur + changement de roles
  - details role-specifiques (`iban`, `siret`, `nom_maison`, `adresse_livraison`)

## API principale ajoutee

### Auth

- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Shop

- `GET /api/shop/livres`
- `GET /api/shop/livres/:idLivre`
- `GET /api/shop/genres`
- `POST /api/precommandes` (requiert utilisateur connecte avec role client)

### Admin users

- `GET /api/admin/users` (admin)
- `POST /api/admin/users` (admin)
- `PUT /api/admin/users/:idUtilisateur/roles` (admin)
