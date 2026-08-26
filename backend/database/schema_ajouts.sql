-- ============================================================
-- SmartFridge - Script des evolutions de schema
-- Ajoute apres l'envoi du Dossier de Projet (Annexe A initiale)
-- Ne modifie pas les 8 tables existantes, les complete uniquement
-- ============================================================

-- 1. Table push_subscriptions
-- Stocke les abonnements aux notifications push (Web Push API)
-- Un utilisateur peut avoir plusieurs abonnements (un par appareil/navigateur)
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Table recipe_translations
-- Cache des recettes TheMealDB deja traduites en francais par l'IA
-- Evite de retraduire (et de rappeler l'API Groq) une recette deja vue
CREATE TABLE recipe_translations (
    id SERIAL PRIMARY KEY,
    id_meal VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    translated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Colonne banner_color sur la table users existante
-- Personnalisation de la couleur de banniere du profil
ALTER TABLE users ADD COLUMN banner_color VARCHAR(20) DEFAULT NULL;
