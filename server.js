require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'makeum-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7일
}));

// API 라우트
app.use('/auth',          require('./routes/oauth'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/posts',     require('./routes/posts'));
app.use('/api/comments',  require('./routes/comments'));
app.use('/api/courses',   require('./routes/courses'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/meetups',   require('./routes/meetups'));
app.use('/api/sso',       require('./routes/sso'));

// 간단 검색 API
app.get('/api/search', (req, res) => {
  const { q, section } = req.query;
  if (!q) return res.json([]);
  const keyword = `%${q}%`;
  let sql = `
    SELECT p.id, p.section, p.board, p.title, p.view_count, p.created_at,
           CASE WHEN p.is_anonymous=1 THEN '익명' ELSE u.nickname END AS author
    FROM posts p JOIN users u ON p.user_id=u.id
    WHERE (p.title LIKE ? OR p.content LIKE ?)
  `;
  const params = [keyword, keyword];
  if (section && section !== 'all') { sql += ' AND p.section=?'; params.push(section); }
  sql += ' ORDER BY p.id DESC LIMIT 50';
  res.json(db.prepare(sql).all(...params));
});

// db import (검색용)
const db = require('./db/database');

// SPA fallback — 모든 미정의 GET은 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`2막이음 서버 시작: http://localhost:${PORT}`);
});
