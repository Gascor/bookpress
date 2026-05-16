-- ============================================================
--  BookPress — Schéma MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS bookpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookpress;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS VENTE, EXPEDITION, LIGNE_BATCH, PRECOMMANDE,
  CONTRAT_REMUNERATION, LIVRE, BATCH_IMPRESSION, TRANSPORTEUR,
  CLIENT, EDITEUR, AUTEUR, UTILISATEUR;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE UTILISATEUR (
  id_utilisateur INT AUTO_INCREMENT PRIMARY KEY,
  nom            VARCHAR(100) NOT NULL,
  prenom         VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe   VARCHAR(255) NOT NULL,
  adresse        TEXT,
  telephone      VARCHAR(20)
);

CREATE TABLE AUTEUR (
  id_utilisateur INT PRIMARY KEY,
  bio            TEXT,
  iban           VARCHAR(34) NOT NULL,
  CONSTRAINT fk_auteur_util FOREIGN KEY (id_utilisateur)
    REFERENCES UTILISATEUR(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE EDITEUR (
  id_utilisateur INT PRIMARY KEY,
  siret          CHAR(14) NOT NULL UNIQUE,
  nom_maison     VARCHAR(200) NOT NULL,
  CONSTRAINT fk_editeur_util FOREIGN KEY (id_utilisateur)
    REFERENCES UTILISATEUR(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE CLIENT (
  id_utilisateur    INT PRIMARY KEY,
  adresse_livraison TEXT,
  CONSTRAINT fk_client_util FOREIGN KEY (id_utilisateur)
    REFERENCES UTILISATEUR(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE LIVRE (
  id_livre      INT AUTO_INCREMENT PRIMARY KEY,
  titre         VARCHAR(300) NOT NULL,
  isbn          VARCHAR(17)  NOT NULL UNIQUE,
  genre         VARCHAR(100),
  prix_unitaire DECIMAL(8,2) NOT NULL CHECK (prix_unitaire > 0),
  id_editeur    INT NOT NULL,
  CONSTRAINT fk_livre_editeur FOREIGN KEY (id_editeur)
    REFERENCES EDITEUR(id_utilisateur)
);

CREATE TABLE CONTRAT_REMUNERATION (
  id_livre           INT NOT NULL,
  id_auteur          INT NOT NULL,
  pourcentage_auteur DECIMAL(5,2) NOT NULL
                       CHECK (pourcentage_auteur > 0 AND pourcentage_auteur <= 100),
  date_signature     DATE NOT NULL,
  PRIMARY KEY (id_livre, id_auteur),
  CONSTRAINT fk_contrat_livre  FOREIGN KEY (id_livre)  REFERENCES LIVRE(id_livre),
  CONSTRAINT fk_contrat_auteur FOREIGN KEY (id_auteur) REFERENCES AUTEUR(id_utilisateur)
);

CREATE TABLE BATCH_IMPRESSION (
  id_batch    INT AUTO_INCREMENT PRIMARY KEY,
  date_prevue DATE NOT NULL,
  statut      ENUM('planifie','en_cours','termine','annule') NOT NULL DEFAULT 'planifie'
);

CREATE TABLE PRECOMMANDE (
  id_precommande INT AUTO_INCREMENT PRIMARY KEY,
  id_client      INT NOT NULL,
  id_livre       INT NOT NULL,
  quantite       INT NOT NULL CHECK (quantite > 0),
  date_commande  DATE NOT NULL DEFAULT (CURRENT_DATE),
  statut         ENUM('en_attente','confirmee','expediee','livree') NOT NULL DEFAULT 'en_attente',
  id_batch       INT,
  CONSTRAINT fk_pre_client FOREIGN KEY (id_client) REFERENCES CLIENT(id_utilisateur),
  CONSTRAINT fk_pre_livre  FOREIGN KEY (id_livre)  REFERENCES LIVRE(id_livre),
  CONSTRAINT fk_pre_batch  FOREIGN KEY (id_batch)  REFERENCES BATCH_IMPRESSION(id_batch)
);

CREATE TABLE LIGNE_BATCH (
  id_batch        INT NOT NULL,
  id_livre        INT NOT NULL,
  quantite_totale INT NOT NULL CHECK (quantite_totale > 0),
  PRIMARY KEY (id_batch, id_livre),
  CONSTRAINT fk_lb_batch FOREIGN KEY (id_batch) REFERENCES BATCH_IMPRESSION(id_batch),
  CONSTRAINT fk_lb_livre FOREIGN KEY (id_livre) REFERENCES LIVRE(id_livre)
);

CREATE TABLE TRANSPORTEUR (
  id_transporteur INT AUTO_INCREMENT PRIMARY KEY,
  nom             VARCHAR(100) NOT NULL,
  contact         VARCHAR(200)
);

CREATE TABLE EXPEDITION (
  id_precommande  INT NOT NULL PRIMARY KEY,
  id_transporteur INT NOT NULL,
  date_envoi      DATE NOT NULL,
  numero_suivi    VARCHAR(100) NOT NULL UNIQUE,
  CONSTRAINT fk_exp_pre   FOREIGN KEY (id_precommande)  REFERENCES PRECOMMANDE(id_precommande),
  CONSTRAINT fk_exp_trans FOREIGN KEY (id_transporteur) REFERENCES TRANSPORTEUR(id_transporteur)
);

CREATE TABLE VENTE (
  id_vente       INT AUTO_INCREMENT PRIMARY KEY,
  id_precommande INT NOT NULL UNIQUE,
  date_vente     DATE NOT NULL,
  montant_total  DECIMAL(10,2) NOT NULL CHECK (montant_total >= 0),
  CONSTRAINT fk_vente_pre FOREIGN KEY (id_precommande) REFERENCES PRECOMMANDE(id_precommande)
);
