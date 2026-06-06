const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.APP_DB_PATH;

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');
  createTables();
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS scripts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT UNIQUE NOT NULL,
      name           TEXT NOT NULL,
      description    TEXT NOT NULL,
      long_desc      TEXT,
      distro         TEXT NOT NULL,
      tested_on      TEXT NOT NULL DEFAULT '',
      logo_url       TEXT DEFAULT '',
      script_content TEXT NOT NULL,
      script_content_ps1 TEXT DEFAULT '',
      downloads      INTEGER DEFAULT 0,
      hearts         INTEGER DEFAULT 0,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS heart_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      script_id  INTEGER REFERENCES scripts(id),
      ip_hash    TEXT NOT NULL,
      token      TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      path       TEXT NOT NULL,
      ip_hash    TEXT,
      user_agent TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS distros (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT 'fa-solid fa-terminal'
    )
  `);
  // migrations for existing DBs
  try { db.run('ALTER TABLE scripts ADD COLUMN script_content_ps1 TEXT DEFAULT \'\''); } catch(e) {}
  try { db.run('ALTER TABLE distros ADD COLUMN icon TEXT DEFAULT \'fa-solid fa-terminal\''); } catch(e) {}
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}



async function all(query, params = []) {
  const d = await getDb();
  const stmt = d.prepare(query);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function get(query, params = []) {
  const rows = await all(query, params);
  return rows[0] || null;
}

async function run(query, params = []) {
  const d = await getDb();
  d.run(query, params);
  save();
}

module.exports = { getDb, all, get, run };
