-- Migration pour ajouter la colonne icon aux tables ingredients et equipments
-- Date: 2025-08-08

-- Ajouter la colonne icon à la table ingredients
ALTER TABLE ingredients ADD COLUMN icon VARCHAR(10) DEFAULT '' AFTER category;

-- Ajouter la colonne icon à la table equipments
ALTER TABLE equipments ADD COLUMN icon VARCHAR(10) DEFAULT '' AFTER category;

-- Optionnel: Mettre à jour quelques ingrédients courants avec des icônes par défaut
UPDATE ingredients SET icon = '🥕' WHERE name LIKE '%carotte%';
UPDATE ingredients SET icon = '🧅' WHERE name LIKE '%oignon%';
UPDATE ingredients SET icon = '🥔' WHERE name LIKE '%pomme de terre%' OR name LIKE '%patate%';
UPDATE ingredients SET icon = '🍅' WHERE name LIKE '%tomate%';
UPDATE ingredients SET icon = '🥒' WHERE name LIKE '%concombre%';
UPDATE ingredients SET icon = '🧄' WHERE name LIKE '%ail%';
UPDATE ingredients SET icon = '🥖' WHERE name LIKE '%pain%' OR name LIKE '%baguette%';
UPDATE ingredients SET icon = '🧀' WHERE name LIKE '%fromage%' OR name LIKE '%gruyère%' OR name LIKE '%parmesan%';
UPDATE ingredients SET icon = '🥚' WHERE name LIKE '%oeuf%' OR name LIKE '%œuf%';
UPDATE ingredients SET icon = '🥛' WHERE name LIKE '%lait%';
UPDATE ingredients SET icon = '🧈' WHERE name LIKE '%beurre%';
UPDATE ingredients SET icon = '🧂' WHERE name LIKE '%sel%';
UPDATE ingredients SET icon = '🌶️' WHERE name LIKE '%poivre%' OR name LIKE '%piment%';
UPDATE ingredients SET icon = '🌿' WHERE name LIKE '%herbe%' OR name LIKE '%basilic%' OR name LIKE '%persil%' OR name LIKE '%thym%';

-- Optionnel: Mettre à jour quelques équipements courants avec des icônes par défaut
UPDATE equipments SET icon = '🍳' WHERE name LIKE '%poêle%' OR name LIKE '%casserole%';
UPDATE equipments SET icon = '🔪' WHERE name LIKE '%couteau%';
UPDATE equipments SET icon = '🥄' WHERE name LIKE '%cuillère%' OR name LIKE '%cuiller%';
UPDATE equipments SET icon = '🍴' WHERE name LIKE '%fourchette%';
UPDATE equipments SET icon = '🥣' WHERE name LIKE '%bol%' OR name LIKE '%saladier%';
UPDATE equipments SET icon = '🍽️' WHERE name LIKE '%assiette%' OR name LIKE '%plat%';
UPDATE equipments SET icon = '⚖️' WHERE name LIKE '%balance%' OR name LIKE '%pèse%';
UPDATE equipments SET icon = '🔥' WHERE name LIKE '%four%';
UPDATE equipments SET icon = '❄️' WHERE name LIKE '%frigo%' OR name LIKE '%réfrigérateur%';
UPDATE equipments SET icon = '⏲️' WHERE name LIKE '%minuteur%' OR name LIKE '%timer%';
