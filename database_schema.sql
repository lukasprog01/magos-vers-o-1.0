-- ==============================================================================
-- MAGOS PLATFORM - Database Schema (MySQL / phpMyAdmin corrigido para utf8mb4)
-- ==============================================================================

-- Remover tabelas antigas se existirem para contornar o problema de chaves longas e recriar corretamente
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS riddles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;

-- 1. Tabela de Usuários (Users)
CREATE TABLE IF NOT EXISTS users (
  -- Tamanho reduzido de 255 para 150. Evita o erro #1071 (max key length) em utf8mb4
  id VARCHAR(150) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  type VARCHAR(50) DEFAULT 'fisica',
  company VARCHAR(255),
  avatar TEXT,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  xpNext INT DEFAULT 200,
  charadasCreated INT DEFAULT 0,
  charadasSolved INT DEFAULT 0,
  streak INT DEFAULT 0,
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  badges TEXT 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Charadas (Riddles)
CREATE TABLE IF NOT EXISTS riddles (
  id VARCHAR(150) PRIMARY KEY,
  authorId VARCHAR(150) NOT NULL,
  question TEXT NOT NULL,
  answer VARCHAR(255) NOT NULL,
  hint TEXT,
  category VARCHAR(100) DEFAULT 'geral',
  difficulty INT DEFAULT 2,
  points INT DEFAULT 100,
  solvedCount INT DEFAULT 0,
  views INT DEFAULT 0,
  isMonthly BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  qrCode TEXT,
  tags TEXT, 
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  monthlyPrize INT,
  FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Respostas e Progresso (Answers)
CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(150) NOT NULL,
  riddleId VARCHAR(150) NOT NULL,
  correct BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INT DEFAULT 1,
  answeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (riddleId) REFERENCES riddles(id) ON DELETE CASCADE,
  UNIQUE(userId, riddleId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Configurações (Settings / Stats)
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERÇÕES DE CONFIGURAÇÃO PADRÃO
INSERT IGNORE INTO settings (`key`, `value`) VALUES ('monthlyPrizePool', '500');
INSERT IGNORE INTO settings (`key`, `value`) VALUES ('monthlyMinLevel', '3');
INSERT IGNORE INTO settings (`key`, `value`) VALUES ('monthlyDeadline', '2026-05-01T00:00:00.000Z');

-- INSERÇÃO DE USUÁRIOS DE DEMONSTRAÇÃO (Já com emojis nativos)
INSERT IGNORE INTO users (id, name, email, password, role, type, company, avatar, level, xp, xpNext, charadasCreated, charadasSolved, streak) 
VALUES ('usr_001', 'Mago Supremo', 'admin@magos.com', 'admin123', 'admin', 'empresa', 'Magos HQ', '🧙‍♂️', 12, 4750, 5000, 24, 87, 7);

INSERT IGNORE INTO users (id, name, email, password, role, type, avatar, level, xp, xpNext, charadasCreated, charadasSolved, streak) 
VALUES ('usr_002', 'Ana Feiticeira', 'ana@demo.com', '123456', 'user', 'fisica', '🧝‍♀️', 8, 2340, 3000, 5, 52, 3);
