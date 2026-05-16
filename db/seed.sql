USE bookpress;

INSERT INTO UTILISATEUR(nom,prenom,email,mot_de_passe,adresse,telephone) VALUES
  ('Dupont','Marie','marie.dupont@mail.fr','$2b$hash01','12 rue des Lilas, 75011 Paris','0601020304'),
  ('Martin','Pierre','pierre.martin@mail.fr','$2b$hash02','8 av. Victor Hugo, 69002 Lyon','0607080910'),
  ('Lefebvre','Sophie','sophie.lefebvre@edit.fr','$2b$hash03','3 bd Émile Zola, 33000 Bordeaux','0612131415'),
  ('Bernard','Luc','luc.bernard@mail.fr','$2b$hash04','22 rue Voltaire, 44000 Nantes','0620212223'),
  ('Rousseau','Claire','claire.rousseau@mail.fr','$2b$hash05','5 pl. de la Paix, 59000 Lille','0630313233'),
  ('Moreau','Antoine','antoine.moreau@auteur.fr','$2b$hash06','17 rue du Faubourg, 67000 Strasbourg','0640414243'),
  ('Simon','Élise','elise.simon@auteur.fr','$2b$hash07','9 allée des Roses, 13008 Marseille','0650515253'),
  ('Laurent','Théo','theo.laurent@edit.fr','$2b$hash08','45 cours Mirabeau, 13100 Aix-en-Provence','0660616263'),
  ('Petit','Isabelle','isabelle.petit@mail.fr','$2b$hash09','2 impasse du Moulin, 31000 Toulouse','0670717273'),
  ('Durand','Hugo','hugo.durand@auteur.fr','$2b$hash10','88 rue de la Liberté, 21000 Dijon','0680818283'),
  ('Leroy','Camille','camille.leroy@mail.fr','$2b$hash11','14 av. de la Gare, 06000 Nice','0690919293'),
  ('Roux','Nicolas','nicolas.roux@edit.fr','$2b$hash12','30 rue du Commerce, 37000 Tours','0601112131'),
  ('David','Emma','emma.david@auteur.fr','$2b$hash13','7 passage des Arts, 75004 Paris','0602122232'),
  ('Bertrand','Jules','jules.bertrand@mail.fr','$2b$hash14','19 rue Nationale, 59100 Roubaix','0603132333'),
  ('Morel','Alice','alice.morel@auteur.fr','$2b$hash15','56 bd de la République, 42000 Saint-Étienne','0604142434'),
  ('Fontaine','Marc','marc.fontaine@edit.fr','$2b$hash16','11 rue des Marchands, 68000 Colmar','0605152535'),
  ('Chevalier','Zoé','zoe.chevalier@mail.fr','$2b$hash17','3 rue du Palais, 35000 Rennes','0606162636'),
  ('Gauthier','Raphaël','raphael.gauthier@auteur.fr','$2b$hash18','28 av. Jean Jaurès, 87000 Limoges','0607172737'),
  ('Blanc','Nathalie','nathalie.blanc@mail.fr','$2b$hash19','66 rue Saint-Michel, 33000 Bordeaux','0608182838'),
  ('Henry','Florian','florian.henry@auteur.fr','$2b$hash20','4 rue des Capucins, 57000 Metz','0609192939');

INSERT INTO AUTEUR(id_utilisateur,bio,iban) VALUES
  (1,'Romancière primée, auteure de 3 romans policiers.','FR7614508890000000012345601'),
  (2,'Essayiste spécialisé en philosophie contemporaine.','FR7614508890000000012345602'),
  (6,'Auteur de science-fiction, lauréat du Grand Prix de l\'Imaginaire 2022.','FR7614508890000000012345606'),
  (7,'Poétesse et dramaturge, 5 recueils publiés.','FR7614508890000000012345607'),
  (10,'Historien spécialisé dans la Révolution française.','FR7614508890000000012345610'),
  (13,'Auteure jeunesse, 200k exemplaires vendus.','FR7614508890000000012345613'),
  (15,'Romancière de littérature blanche, traduite en 8 langues.','FR7614508890000000012345615'),
  (18,'Auteur de thrillers politiques, ex-journaliste.','FR7614508890000000012345618'),
  (20,'Nouvelliste et blogueur littéraire.','FR7614508890000000012345620');

INSERT INTO EDITEUR(id_utilisateur,siret,nom_maison) VALUES
  (3,'12345678901234','Éditions Lumière'),
  (8,'23456789012345','Presses du Sud'),
  (12,'34567890123456','Les Éditions du Fleuve'),
  (16,'45678901234567','Maison Colmar Livres');

INSERT INTO CLIENT(id_utilisateur,adresse_livraison) VALUES
  (4,'22 rue Voltaire, 44000 Nantes'),
  (5,'5 pl. de la Paix, 59000 Lille'),
  (9,'2 impasse du Moulin, 31000 Toulouse'),
  (11,'14 av. de la Gare, 06000 Nice'),
  (14,'19 rue Nationale, 59100 Roubaix'),
  (17,'3 rue du Palais, 35000 Rennes'),
  (19,'66 rue Saint-Michel, 33000 Bordeaux'),
  (1,'12 rue des Lilas, 75011 Paris'),
  (2,'8 av. Victor Hugo, 69002 Lyon'),
  (6,'17 rue du Faubourg, 67000 Strasbourg');

INSERT INTO LIVRE(titre,isbn,genre,prix_unitaire,id_editeur) VALUES
  ('Le Dernier Automne','978-3-16-148410-0','Roman',18.90,3),
  ('Penser le vide','978-3-16-148411-7','Essai',22.00,3),
  ('L\'Île des Murmures','978-3-16-148412-4','Thriller',15.50,3),
  ('Aux confins du doute','978-3-16-148413-1','Essai',19.00,3),
  ('Saisons perdues','978-3-16-148414-8','Roman',16.80,3),
  ('Nexus Zéro','978-3-16-148415-5','Science-fiction',21.50,8),
  ('Fragments d\'aube','978-3-16-148416-2','Poésie',12.00,8),
  ('1794 : La Terreur et l\'Espoir','978-3-16-148417-9','Histoire',24.00,8),
  ('Le Jardin de Mimi','978-3-16-148418-6','Jeunesse',9.90,8),
  ('La Femme de Prague','978-3-16-148419-3','Roman',17.50,8),
  ('Protocole Fantôme','978-3-16-148420-9','Thriller politique',20.00,12),
  ('Murmures du Rhin','978-3-16-148421-6','Roman régional',14.90,12),
  ('Contes des Trois Frontières','978-3-16-148422-3','Jeunesse',11.50,12),
  ('Le Dernier Consul','978-3-16-148423-0','Thriller politique',19.90,12),
  ('Archipel','978-3-16-148424-7','Science-fiction',23.00,12),
  ('Mémoires d\'une place','978-3-16-148425-4','Essai',18.00,16),
  ('La Nuit des Horloges','978-3-16-148426-1','Roman',16.50,16),
  ('Sous le même ciel','978-3-16-148427-8','Littérature blanche',21.00,16),
  ('Nouvelles du bord du monde','978-3-16-148428-5','Nouvelles',13.50,16),
  ('Éclats de voix','978-3-16-148429-2','Poésie',10.90,16);

INSERT INTO CONTRAT_REMUNERATION(id_livre,id_auteur,pourcentage_auteur,date_signature) VALUES
  (1,1,12.00,'2024-01-10'),(2,2,15.00,'2024-02-14'),(3,1,10.00,'2024-03-01'),
  (4,2,13.50,'2024-04-20'),(5,1,11.00,'2024-05-05'),(6,6,14.00,'2024-01-22'),
  (7,7,18.00,'2024-02-28'),(8,10,16.00,'2024-03-15'),(9,13,20.00,'2024-04-10'),
  (10,15,12.50,'2024-05-18'),(11,18,13.00,'2024-01-30'),(12,7,11.50,'2024-03-22'),
  (13,13,19.00,'2024-04-05'),(14,18,14.50,'2024-05-12'),(15,6,15.50,'2024-06-01'),
  (16,2,17.00,'2024-02-08'),(17,15,12.00,'2024-03-19'),(18,15,13.50,'2024-04-25'),
  (19,20,22.00,'2024-05-30'),(20,7,20.00,'2024-06-10'),(3,18,5.00,'2024-03-01'),
  (6,20,6.00,'2024-01-22'),(11,6,4.00,'2024-01-30'),(14,10,3.50,'2024-05-12'),
  (15,18,5.50,'2024-06-01');

INSERT INTO BATCH_IMPRESSION(date_prevue,statut) VALUES
  ('2024-06-07','termine'),('2024-06-14','termine'),('2024-06-21','termine'),
  ('2024-06-28','termine'),('2024-07-05','termine'),('2024-07-12','en_cours'),
  ('2024-07-19','planifie'),('2024-07-26','planifie');

INSERT INTO PRECOMMANDE(id_client,id_livre,quantite,date_commande,statut,id_batch) VALUES
  (4,1,2,'2024-06-01','livree',1),(5,2,1,'2024-06-02','livree',1),
  (9,3,3,'2024-06-03','livree',1),(11,4,1,'2024-06-03','livree',1),
  (14,5,2,'2024-06-04','livree',1),(17,6,1,'2024-06-04','livree',1),
  (19,7,4,'2024-06-05','livree',1),(1,8,1,'2024-06-05','livree',1),
  (2,9,2,'2024-06-05','livree',2),(6,10,1,'2024-06-06','livree',2),
  (4,11,2,'2024-06-08','livree',2),(5,12,1,'2024-06-09','livree',2),
  (9,13,3,'2024-06-09','livree',2),(11,14,1,'2024-06-10','livree',2),
  (14,15,2,'2024-06-10','livree',2),(17,16,1,'2024-06-11','livree',2),
  (19,1,1,'2024-06-12','livree',3),(1,2,2,'2024-06-13','livree',3),
  (2,3,1,'2024-06-13','livree',3),(6,4,3,'2024-06-14','livree',3),
  (4,17,2,'2024-06-15','livree',3),(5,18,1,'2024-06-15','expediee',3),
  (9,19,2,'2024-06-16','expediee',3),(11,20,1,'2024-06-17','expediee',3),
  (14,6,1,'2024-06-17','expediee',4),(17,7,2,'2024-06-18','expediee',4),
  (19,8,1,'2024-06-19','expediee',4),(1,9,3,'2024-06-20','expediee',4),
  (2,10,1,'2024-06-20','expediee',4),(6,11,2,'2024-06-21','expediee',4),
  (4,12,1,'2024-06-23','confirmee',5),(5,13,2,'2024-06-24','confirmee',5),
  (9,14,1,'2024-06-24','confirmee',5),(11,15,3,'2024-06-25','confirmee',5),
  (14,16,1,'2024-06-26','confirmee',5),(17,17,2,'2024-06-27','confirmee',5),
  (19,18,1,'2024-06-28','confirmee',5),(1,19,1,'2024-06-28','confirmee',6),
  (2,20,2,'2024-06-29','confirmee',6),(6,1,1,'2024-06-30','confirmee',6),
  (4,2,3,'2024-07-01','en_attente',6),(5,3,1,'2024-07-02','en_attente',6),
  (9,4,2,'2024-07-02','en_attente',7),(11,5,1,'2024-07-03','en_attente',7),
  (14,6,2,'2024-07-03','en_attente',7),(17,7,1,'2024-07-04','en_attente',7),
  (19,8,3,'2024-07-04','en_attente',8),(1,9,1,'2024-07-05','en_attente',8),
  (2,10,2,'2024-07-05','en_attente',8),(6,11,1,'2024-07-06','en_attente',8);

INSERT INTO LIGNE_BATCH(id_batch,id_livre,quantite_totale) VALUES
  (1,1,2),(1,2,1),(1,3,3),(1,4,1),(1,5,2),(1,6,1),(1,7,4),(1,8,1),
  (2,9,2),(2,10,1),(2,11,2),(2,12,1),(2,13,3),(2,14,1),(2,15,2),(2,16,1),
  (3,1,1),(3,2,2),(3,3,1),(3,4,3),(3,17,2),(3,18,1),(3,19,2),(3,20,1),
  (4,6,1),(4,7,2),(4,8,1),(4,9,3),(4,10,1),(4,11,2),
  (5,12,1),(5,13,2),(5,14,1),(5,15,3),(5,16,1),(5,17,2),(5,18,1),
  (6,19,1),(6,20,2),(6,1,1),
  (7,2,3),(7,3,1),(7,4,2),(7,5,1),(7,6,2),(7,7,1),
  (8,8,3),(8,9,1),(8,10,2),(8,11,1);

INSERT INTO TRANSPORTEUR(nom,contact) VALUES
  ('Colissimo','0800 123 456'),
  ('DHL Express','0800 654 321'),
  ('Mondial Relay','contact@mondialrelay.fr'),
  ('Chronopost','0969 391 391'),
  ('GLS France','0800 456 789');

INSERT INTO EXPEDITION(id_precommande,id_transporteur,date_envoi,numero_suivi) VALUES
  (1,1,'2024-06-07','COL-2024-00001'),(2,2,'2024-06-07','DHL-2024-00002'),
  (3,3,'2024-06-07','MR-2024-00003'),(4,1,'2024-06-07','COL-2024-00004'),
  (5,4,'2024-06-07','CHR-2024-00005'),(6,2,'2024-06-07','DHL-2024-00006'),
  (7,5,'2024-06-07','GLS-2024-00007'),(8,1,'2024-06-07','COL-2024-00008'),
  (9,3,'2024-06-14','MR-2024-00009'),(10,4,'2024-06-14','CHR-2024-00010'),
  (11,1,'2024-06-14','COL-2024-00011'),(12,2,'2024-06-14','DHL-2024-00012'),
  (13,5,'2024-06-14','GLS-2024-00013'),(14,3,'2024-06-14','MR-2024-00014'),
  (15,1,'2024-06-14','COL-2024-00015'),(16,4,'2024-06-14','CHR-2024-00016'),
  (17,2,'2024-06-21','DHL-2024-00017'),(18,1,'2024-06-21','COL-2024-00018'),
  (19,5,'2024-06-21','GLS-2024-00019'),(20,3,'2024-06-21','MR-2024-00020'),
  (21,1,'2024-06-21','COL-2024-00021'),(22,4,'2024-06-28','CHR-2024-00022'),
  (23,2,'2024-06-28','DHL-2024-00023'),(24,1,'2024-06-28','COL-2024-00024'),
  (25,5,'2024-06-28','GLS-2024-00025'),(26,3,'2024-06-28','MR-2024-00026'),
  (27,1,'2024-06-28','COL-2024-00027'),(28,4,'2024-06-28','CHR-2024-00028'),
  (29,2,'2024-06-28','DHL-2024-00029'),(30,1,'2024-06-28','COL-2024-00030');

INSERT INTO VENTE(id_precommande,date_vente,montant_total) VALUES
  (1,'2024-06-07',37.80),(2,'2024-06-07',22.00),(3,'2024-06-07',46.50),
  (4,'2024-06-07',19.00),(5,'2024-06-07',33.60),(6,'2024-06-07',21.50),
  (7,'2024-06-07',48.00),(8,'2024-06-07',24.00),(9,'2024-06-14',19.80),
  (10,'2024-06-14',17.50),(11,'2024-06-14',40.00),(12,'2024-06-14',14.90),
  (13,'2024-06-14',34.50),(14,'2024-06-14',19.90),(15,'2024-06-14',46.00),
  (16,'2024-06-14',18.00),(17,'2024-06-21',16.50),(18,'2024-06-21',44.00),
  (19,'2024-06-21',15.50),(20,'2024-06-21',57.00),(21,'2024-06-21',33.60),
  (22,'2024-06-28',21.00),(23,'2024-06-28',27.00),(24,'2024-06-28',10.90),
  (25,'2024-06-28',20.00),(26,'2024-06-28',23.80),(27,'2024-06-28',24.00),
  (28,'2024-06-28',69.00),(29,'2024-06-28',17.50),(30,'2024-06-28',40.00),
  (31,'2024-07-05',14.90),(32,'2024-07-05',23.00),(33,'2024-07-05',19.90),
  (34,'2024-07-05',69.00),(35,'2024-07-05',18.00),(36,'2024-07-05',33.00),
  (37,'2024-07-05',21.00),(38,'2024-07-05',13.50),(39,'2024-07-05',21.80),
  (40,'2024-07-05',18.90),(41,'2024-07-12',66.00),(42,'2024-07-12',15.50),
  (43,'2024-07-12',38.00),(44,'2024-07-12',16.80),(45,'2024-07-12',43.00),
  (46,'2024-07-12',12.00),(47,'2024-07-12',118.50),(48,'2024-07-12',17.50),
  (49,'2024-07-12',35.00),(50,'2024-07-12',20.00);
