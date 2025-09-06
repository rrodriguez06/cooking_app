-- Initialize cooking database
-- This script will be automatically executed when the PostgreSQL container starts

-- Create the database if it doesn't exist (already handled by POSTGRES_DB)
-- CREATE DATABASE IF NOT EXISTS cooking_db;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The application will handle table creation through GORM migrations
-- This file can be extended with initial data if needed

-- Example of inserting default categories (optional)
-- You can uncomment and modify these after GORM creates the tables

/*
INSERT INTO categories (id, name, description, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Entrées', 'Plats d''entrée et amuse-bouches', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Plats principaux', 'Plats de résistance', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Desserts', 'Desserts et douceurs', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'Boissons', 'Cocktails et boissons', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tags (id, name, color, created_at, updated_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Végétarien', '#4CAF50', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440002', 'Végan', '#2E7D32', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440003', 'Sans gluten', '#FF9800', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440004', 'Rapide', '#F44336', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440005', 'Difficile', '#9C27B0', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
*/
