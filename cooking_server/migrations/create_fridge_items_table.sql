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
    
    -- Index pour optimiser les requêtes par utilisateur
    INDEX idx_fridge_items_user_id (user_id),
    
    -- Index pour optimiser les requêtes par ingrédient
    INDEX idx_fridge_items_ingredient_id (ingredient_id),
    
    -- Index pour optimiser les requêtes par date d'expiration
    INDEX idx_fridge_items_expiry_date (expiry_date),
    
    -- Constraint unique pour éviter les doublons (un utilisateur ne peut avoir le même ingrédient qu'une fois)
    UNIQUE KEY unique_user_ingredient (user_id, ingredient_id)
);

-- Ajouter un trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_fridge_items_updated_at
    BEFORE UPDATE ON fridge_items
    FOR EACH ROW
    SET NEW.updated_at = CURRENT_TIMESTAMP;