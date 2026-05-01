// Script para inicializar o banco de dados SQLite para o projeto Magos
// Para usar, execute:
// 1. npm init -y
// 2. npm install better-sqlite3
// 3. node init-db.js

const Database = require('better-sqlite3');
const path = require('path');

// Cria ou abre o banco de dados na pasta atual
const dbPath = path.join(__dirname, 'magos.db');
const db = new Database(dbPath, { verbose: console.log });

console.log('Iniciando a criação do banco de dados Magos em:', dbPath);

try {
  // Configuração para maior performance
  db.pragma('journal_mode = WAL');

  // 1. Tabela de Usuários (Users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      type TEXT DEFAULT 'fisica',
      company TEXT,
      avatar TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      xpNext INTEGER DEFAULT 200,
      charadasCreated INTEGER DEFAULT 0,
      charadasSolved INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      badges TEXT DEFAULT '[]' -- Armazena JSON array
    )
  `);
  console.log('Tabela "users" criada ou já existente com sucesso.');

  // 2. Tabela de Charadas (Riddles)
  db.exec(`
    CREATE TABLE IF NOT EXISTS riddles (
      id TEXT PRIMARY KEY,
      authorId TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      hint TEXT,
      category TEXT DEFAULT 'geral',
      difficulty INTEGER DEFAULT 2,
      points INTEGER DEFAULT 100,
      solvedCount INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      isMonthly BOOLEAN DEFAULT 0,
      isActive BOOLEAN DEFAULT 1,
      qrCode TEXT,
      tags TEXT DEFAULT '[]', -- Armazena JSON array
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      monthlyPrize INTEGER,
      FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('Tabela "riddles" criada ou já existente com sucesso.');

  // 3. Tabela de Respostas e Progresso (Answers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      riddleId TEXT NOT NULL,
      correct BOOLEAN NOT NULL DEFAULT 0,
      attempts INTEGER DEFAULT 1,
      answeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (riddleId) REFERENCES riddles(id) ON DELETE CASCADE,
      UNIQUE(userId, riddleId, correct) -- Previne inserções duplicadas de sucessos
    )
  `);
  console.log('Tabela "answers" criada ou já existente com sucesso.');

  // 4. Tabela para Configurações Gerais da Plataforma (Settings/App State)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Inserir configurações padrão caso não existam
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('monthlyPrizePool', '500');
  insertSetting.run('monthlyMinLevel', '3');
  
  // Define o prazo mensal para o próximo mês
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
  insertSetting.run('monthlyDeadline', nextMonth);
  console.log('Tabela "settings" criada com as configurações padrões.');

  console.log('==================================================');
  console.log('✅ Banco de dados SQLite criado/atualizado com sucesso!');
  console.log('Arquivo gerado: ', dbPath);
  console.log('==================================================');

} catch (error) {
  console.error('❌ Erro ao criar o banco de dados:', error);
} finally {
  db.close();
}
