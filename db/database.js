const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

// WAL 모드 + 외래키 활성화
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

// 스키마 초기화
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// 기존 DB에 신규 컬럼 추가 (이미 있으면 무시)
try { db.exec('ALTER TABLE notices ADD COLUMN content TEXT DEFAULT ""'); } catch(e) {}
try { db.exec('ALTER TABLE notices ADD COLUMN pinned INTEGER DEFAULT 1'); } catch(e) {}
try { db.exec('ALTER TABLE notices ADD COLUMN image_path TEXT DEFAULT ""'); } catch(e) {}
try { db.exec('ALTER TABLE posts ADD COLUMN pinned INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN oauth_provider TEXT DEFAULT NULL'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN oauth_id TEXT DEFAULT NULL'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN banned_at TEXT DEFAULT NULL'); } catch(e) {}
try { db.exec(`CREATE TABLE IF NOT EXISTS banned_emails (
  email TEXT PRIMARY KEY,
  reason TEXT DEFAULT '',
  banned_at TEXT DEFAULT (datetime('now','localtime'))
)`); } catch(e) {}

module.exports = db;
