# BookPress — Démonstration BDD

Application web de démonstration du schéma relationnel BookPress.
Stack : Node.js + Express + MySQL

## Prérequis

- Node.js 18+
- MySQL 8+ en cours d'exécution

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base de données
cp .env.example .env
# Éditer .env avec vos identifiants MySQL

# 3. Créer le schéma et insérer les données
npm run setup

# 4. Lancer le serveur
npm start
```

Ouvrir http://localhost:3000

## Pages

| Page               | Description                                          |
|--------------------|------------------------------------------------------|
| Tableau de bord    | KPIs + graphiques CA par genre et ventes/semaine     |
| Catalogue livres   | 20 livres filtrables par genre                       |
| Auteurs            | Classement par revenus avec biographies              |
| Précommandes       | 50 commandes filtrables par statut                   |
| Batches impression | 8 batches avec détails (titres, exemplaires)         |
| Explorateur SQL    | Console SELECT live avec requêtes prédéfinies        |

## SGBD

MySQL 8. Le fichier `db/schema.sql` contient le schéma complet.
Le fichier `db/seed.sql` contient les données d'exemple.
