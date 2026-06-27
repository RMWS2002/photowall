const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'photo-wall.db');
let _db = null;

function makeWrapper(sqlDb, saveFn) {
  return {
    pragma() {},
    prepare(sql) {
      return {
        get(...params) {
          const s = sqlDb.prepare(sql); s.bind(params);
          let row = null; if (s.step()) row = s.getAsObject();
          s.free(); return row;
        },
        all(...params) {
          const s = sqlDb.prepare(sql); s.bind(params);
          const rows = []; while (s.step()) rows.push(s.getAsObject());
          s.free(); return rows;
        },
        run(...params) {
          const s = sqlDb.prepare(sql); s.bind(params); s.step(); s.free();
          const lastId = sqlDb.exec("SELECT last_insert_rowid()");
          saveFn();
          return { changes: sqlDb.getRowsModified(), lastInsertRowid: (lastId[0]?.values?.[0]?.[0]) ?? 0 };
        }
      };
    },
    exec(sql) { const r = sqlDb.exec(sql); saveFn(); return r; }
  };
}

async function initDB() {
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    try { const buf = fs.readFileSync(DB_PATH); sqlDb = new SQL.Database(buf); }
    catch(e) { sqlDb = new SQL.Database(); }
  } else { sqlDb = new SQL.Database(); }

  const save = () => { try { fs.writeFileSync(DB_PATH, Buffer.from(sqlDb.export())); } catch(e) {} };
  const db = makeWrapper(sqlDb, save);

  sqlDb.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  sqlDb.run(`CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    created_by INTEGER,
    used_by INTEGER,
    used_at DATETIME,
    max_uses INTEGER DEFAULT 1,
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  sqlDb.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    media_type TEXT DEFAULT 'photo',
    music_filename TEXT DEFAULT '',
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    file_size INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 兼容旧表：添加缺失的列
  try { sqlDb.run("ALTER TABLE photos ADD COLUMN media_type TEXT DEFAULT 'photo'"); } catch(e) {}
  try { sqlDb.run("ALTER TABLE photos ADD COLUMN music_filename TEXT DEFAULT ''"); } catch(e) {}

  sqlDb.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  sqlDb.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    photo_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, photo_id)
  )`);

  sqlDb.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  save();
  _db = db;

  const bcrypt = require('bcryptjs');
  const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users(username,email,password_hash,role,status) VALUES(?,?,?,?,?)")
      .run('admin', 'admin@pw.com', hash, 'admin', 'active');
    db.prepare("INSERT INTO invites(code,created_by,max_uses) VALUES(?,?,?)")
      .run('WELCOME01', 1, 999);
  }

  return db;
}

function getDB() {
  if (!_db) throw new Error('数据库未初始化，请先调用 initDB()');
  return _db;
}

module.exports = { initDB, getDB };
