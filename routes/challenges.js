const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db/database');
const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const CHALLENGE_BOARDS = ['ch_walk', 'ch_morning', 'ch_health'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

// 오늘의 챌린지 — community.html 3행 통계
router.get('/board-stats', (req, res) => {
  const t = today();
  const defs = [
    { board: 'ch_walk',    label: '오늘도 활기차게 발도장', emoji: '👟' },
    { board: 'ch_morning', label: '내몸을 깨우는 아침 한잔', emoji: '🥛' },
    { board: 'ch_health',  label: '백세 건강 약속',          emoji: '💊' },
  ];
  const result = defs.map(b => ({
    ...b,
    count: db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM posts WHERE board=? AND date(created_at)=?").get(b.board, t).c,
  }));
  res.json(result);
});

// 챌린지 게시판 게시글 (날짜별)
router.get('/board-posts', (req, res) => {
  const { board, date: d = today() } = req.query;
  if (!CHALLENGE_BOARDS.includes(board)) return res.status(400).json({ error: '잘못된 게시판' });
  const userId = req.session.user?.id || null;

  // 해당 날짜 게시글 (시간순 asc → rank 부여 후 desc 반환)
  const rows = db.prepare(`
    SELECT p.id, p.content, p.user_id, p.created_at,
           CASE WHEN u.deleted_at IS NOT NULL THEN '탈퇴한 회원' ELSE u.nickname END as nickname
    FROM posts p JOIN users u ON p.user_id=u.id
    WHERE p.board=? AND date(p.created_at)=?
    ORDER BY p.created_at ASC
  `).all(board, d);
  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 })).reverse();

  // 내가 글 쓴 날짜 목록 (캘린더용)
  const myDates = userId
    ? db.prepare("SELECT DISTINCT date(created_at) as d FROM posts WHERE board=? AND user_id=?").all(board, userId).map(r => r.d)
    : [];

  // 오늘 이미 작성했는지
  const alreadyPosted = userId
    ? !!db.prepare("SELECT 1 FROM posts WHERE board=? AND user_id=? AND date(created_at)=?").get(board, userId, today())
    : false;

  const todayCount = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM posts WHERE board=? AND date(created_at)=?").get(board, today()).c;

  // 표시된 유저들의 달성 배지
  const userIds = [...new Set(rows.map(r => r.user_id))];
  const achievements = {};
  userIds.forEach(uid => {
    achievements[uid] = db.prepare('SELECT board FROM ch_achievements WHERE user_id=?').all(uid).map(a => a.board);
  });

  // 응원(cheer) 수
  const cheerCounts = {};
  ranked.forEach(p => {
    cheerCounts[p.id] = db.prepare("SELECT COUNT(*) as c FROM reactions WHERE post_id=? AND type='cheer'").get(p.id).c;
  });
  const myCheer = {};
  if (userId) {
    ranked.forEach(p => {
      myCheer[p.id] = !!db.prepare("SELECT 1 FROM reactions WHERE post_id=? AND user_id=? AND type='cheer'").get(p.id, userId);
    });
  }

  // 이미지 (images 테이블)
  const imageMaps = {};
  ranked.forEach(p => {
    const imgs = db.prepare('SELECT file_path FROM images WHERE post_id=?').all(p.id);
    imageMaps[p.id] = imgs.map(i => i.file_path);
  });

  res.json({ posts: ranked, myDates, alreadyPosted, todayCount, achievements, cheerCounts, myCheer, imageMaps });
});

// 30일 달성 체크
router.post('/check-achievement', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인 필요' });
  const { board } = req.body;
  if (!CHALLENGE_BOARDS.includes(board)) return res.status(400).json({ error: '잘못된 게시판' });
  const userId = req.session.user.id;

  const distinctDays = db.prepare("SELECT COUNT(DISTINCT date(created_at)) as c FROM posts WHERE board=? AND user_id=?").get(board, userId).c;
  let newAchievement = false;
  if (distinctDays >= 30) {
    const r = db.prepare('INSERT OR IGNORE INTO ch_achievements(user_id,board) VALUES(?,?)').run(userId, board);
    if (r.changes > 0) newAchievement = true;
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM ch_achievements WHERE user_id=?').get(userId).c;
  res.json({ ok: true, distinctDays, newAchievement, totalAchievements: total });
});

// 오늘의 명언 (날짜 기반 결정적 순환)
function getDailyQuote() {
  const all = db.prepare('SELECT * FROM quotes WHERE active=1 ORDER BY id DESC').all();
  if (!all.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return all[day % all.length];
}

// 공지&이벤트: pinned=1 최신 3건 + 오늘의 명언 (커뮤니티 메인용)
router.get('/notices', (req, res) => {
  const notices = db.prepare(
    "SELECT id, board as type, title, created_at, pinned FROM posts WHERE section='notice' AND pinned=1 ORDER BY id DESC LIMIT 3"
  ).all();
  res.json({ notices, event: null, todayQuote: getDailyQuote() });
});

// 오늘의 명언만 별도 조회
router.get('/quote/today', (req, res) => {
  res.json({ quote: getDailyQuote() });
});

// 명언 목록 (공개 — notices.html 명언 탭용)
router.get('/quotes/list', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM quotes WHERE active=1').get().cnt;
  const rows  = db.prepare('SELECT * FROM quotes WHERE active=1 ORDER BY id DESC LIMIT ? OFFSET ?').all(Number(limit), offset);
  res.json({ total, rows });
});

// 명언 등록 (관리자)
router.post('/quotes', (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 등록 가능합니다.' });
  const { content, author } = req.body;
  if (!content) return res.status(400).json({ error: '명언 내용을 입력해주세요.' });
  const r = db.prepare('INSERT INTO quotes(content,author) VALUES(?,?)').run(content, author || '');
  res.json({ ok: true, id: r.lastInsertRowid });
});

// 명언 삭제 (관리자)
router.delete('/quotes/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 삭제 가능합니다.' });
  db.prepare('UPDATE quotes SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// 공지 전체 목록 (posts 테이블 기반)
router.get('/notices/all', (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const params = [];
  let extra = '';
  if (type && type !== 'all') { extra = ' AND board=?'; params.push(type); }
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM posts WHERE section='notice'${extra}`).get(...params).cnt;
  const rows  = db.prepare(
    `SELECT id, board as type, title, content, created_at, pinned FROM posts WHERE section='notice'${extra} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(limit), Number(offset));
  res.json({ total, rows });
});

// 공지 단건 조회 — /all 보다 반드시 뒤에 위치
router.get('/notices/:id', (req, res) => {
  const row = db.prepare(
    "SELECT id, board as type, title, content, created_at, pinned FROM posts WHERE id=? AND section='notice'"
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: '없는 공지입니다.' });
  res.json({ notice: row });
});

// 공지 등록 (관리자) — posts 테이블에 저장
router.post('/notices', upload.single('image'), (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 작성할 수 있습니다.' });
  const { type, title, content, pinned } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });
  const r = db.prepare(
    'INSERT INTO posts(user_id,section,board,title,content,pinned) VALUES(?,?,?,?,?,?)'
  ).run(req.session.user.id, 'notice', type || 'notice', title, content || '', pinned === '1' ? 1 : 0);
  if (req.file) db.prepare('INSERT INTO images(post_id,file_path) VALUES(?,?)').run(r.lastInsertRowid, '/uploads/' + req.file.filename);
  res.json({ ok: true, id: r.lastInsertRowid });
});

// 공지 수정 (관리자)
router.put('/notices/:id', upload.single('image'), (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 수정할 수 있습니다.' });
  const { type, title, content, pinned } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });
  db.prepare("UPDATE posts SET board=?,title=?,content=?,pinned=? WHERE id=? AND section='notice'").run(
    type || 'notice', title, content || '', pinned === '1' ? 1 : 0, req.params.id
  );
  if (req.file) {
    db.prepare('DELETE FROM images WHERE post_id=?').run(req.params.id);
    db.prepare('INSERT INTO images(post_id,file_path) VALUES(?,?)').run(req.params.id, '/uploads/' + req.file.filename);
  }
  res.json({ ok: true });
});

// 공지 커뮤니티 메인 표시 토글 (관리자)
router.patch('/notices/:id/pin', (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 변경할 수 있습니다.' });
  const cur = db.prepare("SELECT pinned FROM posts WHERE id=? AND section='notice'").get(req.params.id);
  if (!cur) return res.status(404).json({ error: '없는 공지입니다.' });
  const next = cur.pinned ? 0 : 1;
  db.prepare('UPDATE posts SET pinned=? WHERE id=?').run(next, req.params.id);
  res.json({ ok: true, pinned: next });
});

router.delete('/notices/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 삭제 가능합니다.' });
  db.prepare("DELETE FROM posts WHERE id=? AND section='notice'").run(req.params.id);
  db.prepare('DELETE FROM images WHERE post_id=?').run(req.params.id);
  res.json({ ok: true });
});

// 명언 수정 (관리자)
router.put('/quotes/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') return res.status(403).json({ error: '관리자만 수정할 수 있습니다.' });
  const { content, author } = req.body;
  if (!content) return res.status(400).json({ error: '명언 내용을 입력해주세요.' });
  db.prepare('UPDATE quotes SET content=?,author=? WHERE id=?').run(content, author || '', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
