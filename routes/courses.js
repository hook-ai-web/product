const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/courses?type=online|cert|hobby
router.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare('SELECT * FROM courses WHERE type=? ORDER BY id DESC').all(type)
    : db.prepare('SELECT * FROM courses ORDER BY id DESC').all();
  res.json(rows);
});

module.exports = router;
