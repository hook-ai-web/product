const express = require('express');
const db = require('../db/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// 댓글 작성
router.post('/', requireLogin, (req, res) => {
  const { post_id, content, is_anonymous } = req.body;
  if (!post_id || !content) return res.status(400).json({ error: '내용을 입력해주세요.' });

  const result = db.prepare(
    'INSERT INTO comments(post_id,user_id,content,is_anonymous) VALUES(?,?,?,?)'
  ).run(Number(post_id), req.session.user.id, content, is_anonymous === '1' ? 1 : 0);

  res.json({ ok: true, id: result.lastInsertRowid });
});

// 댓글 삭제
router.delete('/:id', requireLogin, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
  if (comment.user_id !== req.session.user.id && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  db.prepare('DELETE FROM comments WHERE id=?').run(comment.id);
  res.json({ ok: true });
});

module.exports = router;
