import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { SALAS, USUARIOS } from './dados-iniciais.js';

const ARQUIVO_PADRAO = fileURLToPath(new URL('../dados/semana-academica.db', import.meta.url));

// Ordem de criação; o reset apaga na ordem inversa por causa das chaves estrangeiras.
const TABELAS = ['usuarios', 'salas', 'atividades', 'encontros'];

export function abrirBanco(arquivo = process.env.ARQUIVO_BANCO || ARQUIVO_PADRAO) {
  mkdirSync(dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS usuarios (
      id    TEXT PRIMARY KEY,
      nome  TEXT NOT NULL,
      papel TEXT NOT NULL CHECK (papel IN ('organizacao', 'participante'))
    );
    CREATE TABLE IF NOT EXISTS salas (
      id         TEXT PRIMARY KEY,
      nome       TEXT NOT NULL,
      capacidade INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS atividades (
      id     TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      tipo   TEXT NOT NULL CHECK (tipo IN ('palestra', 'minicurso')),
      sala_id TEXT NOT NULL REFERENCES salas (id),
      vagas  INTEGER NOT NULL,
      -- M1: o único estado gravado além da entrada (P-27); situacao e contagens são calculadas.
      cancelada INTEGER NOT NULL DEFAULT 0
    );
    -- inicio e fim guardam o texto como veio (M1 R11); os _ms servem para ordenar e calcular.
    CREATE TABLE IF NOT EXISTS encontros (
      id           TEXT PRIMARY KEY,
      atividade_id TEXT NOT NULL REFERENCES atividades (id),
      inicio       TEXT NOT NULL,
      fim          TEXT NOT NULL,
      inicio_ms    INTEGER NOT NULL,
      fim_ms       INTEGER NOT NULL
    );
  `);
  // Banco criado antes da coluna cancelada existir.
  const colunas = db.prepare('PRAGMA table_info(atividades)').all().map((c) => c.name);
  if (!colunas.includes('cancelada')) db.exec('ALTER TABLE atividades ADD COLUMN cancelada INTEGER NOT NULL DEFAULT 0');
  const vazio = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n === 0;
  if (vazio) carregarDadosIniciais(db);
  return db;
}

export function zerarBanco(db) {
  db.exec('BEGIN');
  try {
    for (const tabela of [...TABELAS].reverse()) db.exec(`DELETE FROM ${tabela}`);
    carregarDadosIniciais(db);
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

function carregarDadosIniciais(db) {
  const usuario = db.prepare('INSERT INTO usuarios (id, nome, papel) VALUES (?, ?, ?)');
  for (const u of USUARIOS) usuario.run(u.id, u.nome, u.papel);
  const sala = db.prepare('INSERT INTO salas (id, nome, capacidade) VALUES (?, ?, ?)');
  for (const s of SALAS) sala.run(s.id, s.nome, s.capacidade);
}
