-- 회원
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  region TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  deleted_at TEXT DEFAULT NULL,
  withdrawal_reason TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  oauth_provider TEXT DEFAULT NULL,
  oauth_id TEXT DEFAULT NULL
);

-- 게시글 (생활정보·일자리·지원혜택·커뮤니티 통합)
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  section TEXT NOT NULL,
  board TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous INTEGER DEFAULT 0,
  region TEXT DEFAULT '',
  trade_type TEXT DEFAULT '',
  price INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_anonymous INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY(post_id) REFERENCES posts(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 이미지 첨부
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  FOREIGN KEY(post_id) REFERENCES posts(id)
);

-- 배움터 강좌
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  provider TEXT DEFAULT '',
  link TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 좋아요
CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  PRIMARY KEY(user_id, post_id)
);

-- 반응 (고민상담소: 토닥토닥/힘내세요/속상해요)
CREATE TABLE IF NOT EXISTS reactions (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  PRIMARY KEY(post_id, user_id, type),
  FOREIGN KEY(post_id) REFERENCES posts(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 건강 챌린지 정의
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '✅',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- 챌린지 인증 로그 (일별)
CREATE TABLE IF NOT EXISTS challenge_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  challenge_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(user_id, challenge_id, date)
);

-- 공지&이벤트
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT DEFAULT 'notice',
  title TEXT NOT NULL,
  link TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- 오늘의 명언
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  author TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- SSO 클라이언트 (신뢰할 수 있는 앱 등록)
CREATE TABLE IF NOT EXISTS sso_clients (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  name TEXT NOT NULL,
  redirect_uris TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- SSO 인가 코드 (단회용, 5분 유효)
CREATE TABLE IF NOT EXISTS sso_codes (
  code TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 소모임
CREATE TABLE IF NOT EXISTS meetups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT DEFAULT '👥',
  location TEXT DEFAULT '',
  member_count INTEGER DEFAULT 0,
  is_recruiting INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
