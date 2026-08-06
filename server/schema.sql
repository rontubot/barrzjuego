-- PostgreSQL Database Schema for Barrzjuego

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  username VARCHAR(100),
  avatar VARCHAR(50) DEFAULT 'crown',
  avatar_type VARCHAR(20) DEFAULT 'preset',
  custom_avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migraciones para base de datos existente
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(50) DEFAULT 'crown';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'preset';
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;

CREATE TABLE IF NOT EXISTS game_history (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(50) NOT NULL,
  rounds_count INT NOT NULL,
  points INT NOT NULL,
  result VARCHAR(20) NOT NULL,
  player_rank INT,
  players TEXT,
  scores TEXT,
  details TEXT,
  battle_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migración para la columna details en game_history existente
ALTER TABLE game_history ADD COLUMN IF NOT EXISTS details TEXT;

-- Migración para guardar tokens de Spotify vinculados al usuario
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMP;

