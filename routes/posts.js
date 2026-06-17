const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db/database');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const ADMIN_SECTIONS = ['life', 'job', 'benefit'];

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// 게시글 목록 (페이지네이션)
// GET /api/posts?section=&board=&page=1&limit=20&region=&trade_type=
router.get('/', (req, res) => {
  const { section, board, page = 1, limit = 20, region, trade_type } = req.query;
  const offset = (page - 1) * limit;

  let where = ["p.section != 'notice'"];
  let params = [];

  if (section && section !== 'all') { where.push('p.section=?'); params.push(section); }
  if (board && board !== 'all')     { where.push('p.board=?');   params.push(board); }
  if (region)                        { where.push('p.region LIKE ?'); params.push(region + '%'); }
  if (trade_type)                    { where.push('p.trade_type=?'); params.push(trade_type); }

  const cond = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM posts p ${cond}`).get(...params).cnt;
  const rows = db.prepare(`
    SELECT p.id, p.section, p.board, p.title, p.is_anonymous, p.region,
           p.trade_type, p.price, p.view_count, p.created_at,
           CASE WHEN p.is_anonymous=1 THEN '익명' ELSE u.nickname END AS author,
           (SELECT file_path FROM images WHERE post_id=p.id ORDER BY id ASC LIMIT 1) AS thumb
    FROM posts p JOIN users u ON p.user_id=u.id
    ${cond}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  res.json({ total, page: Number(page), limit: Number(limit), rows });
});

// 게시글 상세
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, CASE WHEN p.is_anonymous=1 THEN '익명' ELSE u.nickname END AS author
    FROM posts p JOIN users u ON p.user_id=u.id WHERE p.id=?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

  // 조회수 증가
  db.prepare('UPDATE posts SET view_count=view_count+1 WHERE id=?').run(post.id);
  post.view_count += 1;

  const images = db.prepare('SELECT file_path FROM images WHERE post_id=?').all(post.id);
  const comments = db.prepare(`
    SELECT c.id, c.content, c.is_anonymous, c.created_at,
           CASE WHEN c.is_anonymous=1 THEN '익명' ELSE u.nickname END AS author
    FROM comments c JOIN users u ON c.user_id=u.id
    WHERE c.post_id=? ORDER BY c.id ASC
  `).all(post.id);

  res.json({ post, images, comments });
});

// 게시글 작성
router.post('/', requireLogin, upload.array('images', 5), (req, res) => {
  const { section, board, title, content, is_anonymous, region, trade_type, price } = req.body;
  if (!section || !board || !title || !content) {
    return res.status(400).json({ error: '필수 항목을 입력해주세요.' });
  }
  if (ADMIN_SECTIONS.includes(section) && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 작성할 수 있는 게시판입니다.' });
  }
  const result = db.prepare(`
    INSERT INTO posts(user_id,section,board,title,content,is_anonymous,region,trade_type,price)
    VALUES(?,?,?,?,?,?,?,?,?)
  `).run(
    req.session.user.id, section, board, title, content,
    is_anonymous === '1' ? 1 : 0,
    region || '', trade_type || '', Number(price) || 0
  );
  const postId = result.lastInsertRowid;

  if (req.files && req.files.length) {
    const insertImg = db.prepare('INSERT INTO images(post_id,file_path) VALUES(?,?)');
    req.files.forEach(f => insertImg.run(postId, '/uploads/' + f.filename));
  }

  res.json({ ok: true, id: postId });
});

// 게시글 수정
router.put('/:id', requireLogin, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  if (post.user_id !== req.session.user.id && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: '수정 권한이 없습니다.' });
  }
  const { title, content, region, trade_type, price } = req.body;
  db.prepare(`
    UPDATE posts SET title=?,content=?,region=?,trade_type=?,price=?,
    updated_at=datetime('now','localtime') WHERE id=?
  `).run(title, content, region || '', trade_type || '', Number(price) || 0, post.id);

  res.json({ ok: true });
});

// 게시글 삭제
router.delete('/:id', requireLogin, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  if (post.user_id !== req.session.user.id && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  db.prepare('DELETE FROM comments WHERE post_id=?').run(post.id);
  db.prepare('DELETE FROM images WHERE post_id=?').run(post.id);
  db.prepare('DELETE FROM posts WHERE id=?').run(post.id);
  res.json({ ok: true });
});

module.exports = router;
