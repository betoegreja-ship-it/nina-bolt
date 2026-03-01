// memory/db.js — Memória persistente com SQLite
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "../bolt_memory.db"));

// Cria tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT    NOT NULL,
    role      TEXT    NOT NULL,       -- 'user' | 'assistant'
    content   TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    key        TEXT UNIQUE NOT NULL,
    label      TEXT,
    active     INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT,
    api_key    TEXT,
    route      TEXT,
    status     INTEGER,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Mensagens ──────────────────────────────────────────
export function allMsgs(userId, limit = 20) {
  return db
    .prepare(
      `SELECT role, content FROM messages
       WHERE user_id = ?
       ORDER BY id DESC LIMIT ?`
    )
    .all(userId, limit)
    .reverse();
}

export function saveMsg(userId, role, content) {
  db.prepare(
    `INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)`
  ).run(userId, role, content);
}

export function clearAllMsgs() {
  db.prepare('DELETE FROM messages').run();
}

export function clearAllMsgs() {
  db.prepare("DELETE FROM messages").run();
}

export function clearMsgs(userId) {
  db.prepare(`DELETE FROM messages WHERE user_id = ?`).run(userId);
}

// ── API Keys ───────────────────────────────────────────
export function createApiKey(key, label = "") {
  db.prepare(`INSERT INTO api_keys (key, label) VALUES (?, ?)`).run(key, label);
}

export function isValidKey(key) {
  const row = db
    .prepare(`SELECT 1 FROM api_keys WHERE key = ? AND active = 1`)
    .get(key);
  return !!row;
}

export function listKeys() {
  return db.prepare(`SELECT id, key, label, active, created_at FROM api_keys`).all();
}

export function revokeKey(key) {
  db.prepare(`UPDATE api_keys SET active = 0 WHERE key = ?`).run(key);
}

// ── Logs ───────────────────────────────────────────────
export function saveLog({ userId, apiKey, route, status, durationMs }) {
  db.prepare(
    `INSERT INTO logs (user_id, api_key, route, status, duration_ms)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId || null, apiKey || null, route, status, durationMs);
}

export function getLogs(limit = 100) {
  return db
    .prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT ?`)
    .all(limit);
}
