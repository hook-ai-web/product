const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/meetups?category=운동
router.get('/', (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare('SELECT * FROM meetups WHERE category=? ORDER BY member_count DESC').all(category)
    : db.prepare('SELECT * FROM meetups ORDER BY member_count DESC LIMIT 20').all();
  res.json(rows);
});

module.exports = router;
