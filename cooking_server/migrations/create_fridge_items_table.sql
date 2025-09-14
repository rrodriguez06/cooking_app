-- Création de la table fridge_items pour stocker les ingrédients du frigo des utilisateurs
-- Migration: create_fridge_items_table
-- Date: 2024-09-14

CREATE TABLE IF NOT EXISTS fridge_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    expiry_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint unique pour éviter les doublons (un utilisateur ne peut avoir le même ingrédient qu'une fois)
    CONSTRAINT unique_user_ingredient UNIQUE (user_id, ingredient_id)
);

-- Index pour optimiser les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_fridge_items_user_id ON fridge_items(user_id);

-- Index pour optimiser les requêtes par ingrédient
CREATE INDEX IF NOT EXISTS idx_fridge_items_ingredient_id ON fridge_items(ingredient_id);

-- Index pour optimiser les requêtes par date d'expiration
CREATE INDEX IF NOT EXISTS idx_fridge_items_expiry_date ON fridge_items(expiry_date);

-- Créer une fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ajouter un trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_fridge_items_updated_at
    BEFORE UPDATE ON fridge_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();