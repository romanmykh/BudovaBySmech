import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const file = process.env.DB_FILE ?? resolve(process.cwd(), 'data/budova.sqlite');
mkdirSync(dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password     TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  data         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at DESC);
`);

export interface UserRow {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  data: string;
  created_at: string;
  updated_at: string;
}
