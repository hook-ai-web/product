const express = require('express');
const db = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
const VALID_TYPES = ['tadak', 'fighting', 'sad', 'like', 'cheer'];

// POST /api/reactions/:postId/:type — 토글
router.post('/:postId/:type', requireLogin, (req, res) => {
  const { postId, type } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: '잘못된 반응 유형' });

  const userId = req.session.user.id;
  const existing = db.prepare(
    'SELECT 1 FROM reactions WHERE post_id=? AND user_id=? AND type=?'
  ).get(postId, userId, type);

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE post_id=? AND user_id=? AND type=?').run(postId, userId, type);
  } else {
    db.prepare('INSERT OR IGNORE INTO reactions(post_id,user_id,type) VALUES(?,?,?)').run(postId, userId, type);
  }

  const count = db.prepare(
    'SELECT COUNT(*) as cnt FROM reactions WHERE post_id=? AND type=?'
  ).get(postId, type).cnt;

  res.json({ ok: true, count, added: !existing });
});

// GET /api/reactions/counts?post_ids=1,2,3 — 배치 조회
router.get('/counts', (req, res) => {
  const ids = (req.query.post_ids || '').split(',').map(Number).filter(Boolean);
  if (!ids.length) return res.json({});

  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT post_id, type, COUNT(*) as cnt
    FROM reactions WHERE post_id IN (${placeholders})
    GROUP BY post_id, type
  `).all(...ids);

  const result = {};
  ids.forEach(id => { result[id] = { tadak: 0, fighting: 0, sad: 0, like: 0 }; });
  rows.forEach(r => { if (result[r.post_id]) result[r.post_id][r.type] = r.cnt; });

  // 로그인한 경우 내 반응 여부도 포함
  if (req.session.user) {
    const myRows = db.prepare(`
      SELECT post_id, type FROM reactions WHERE user_id=? AND post_id IN (${placeholders})
    `).all(req.session.user.id, ...ids);
    ids.forEach(id => { result[id]._mine = {}; });
    myRows.forEach(r => { if (result[r.post_id]) result[r.post_id]._mine[r.type] = true; });
  }

  res.json(result);
});

module.exports = router;
