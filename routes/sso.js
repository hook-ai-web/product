const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function getClient(clientId) {
  return db.prepare('SELECT * FROM sso_clients WHERE id=?').get(clientId);
}

function isRedirectUriAllowed(client, redirectUri) {
  try {
    return JSON.parse(client.redirect_uris).includes(redirectUri);
  } catch { return false; }
}

function issueCodeAndRedirect(res, userId, clientId, redirectUri, state) {
  const code = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sso_codes(code,user_id,client_id,redirect_uri,expires_at) VALUES(?,?,?,?,?)')
    .run(code, userId, clientId, redirectUri, expiresAt);

  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) url.searchParams.set('state', state);
  res.redirect(url.toString());
}

// ── SSO 시작 ──────────────────────────────────────────────────────────
// GET /api/sso?client_id=X&redirect_uri=Y&state=Z
// 외부 사이트가 사용자를 이 URL로 보냄
router.get('/', (req, res) => {
  const { client_id, redirect_uri, state } = req.query;

  if (!client_id || !redirect_uri) {
    return res.status(400).send('client_id 와 redirect_uri 가 필요합니다.');
  }
  const client = getClient(client_id);
  if (!client || !isRedirectUriAllowed(client, redirect_uri)) {
    return res.status(400).send('등록되지 않은 클라이언트 또는 허용되지 않은 redirect_uri 입니다.');
  }

  if (!req.session.user) {
    req.session.pendingSSO = { client_id, redirect_uri, state };
    return res.redirect('/login.html?next=/api/sso/continue');
  }

  issueCodeAndRedirect(res, req.session.user.id, client_id, redirect_uri, state);
});

// ── 로그인 완료 후 복귀 ────────────────────────────────────────────────
// GET /api/sso/continue
router.get('/continue', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  const sso = req.session.pendingSSO;
  if (!sso) {
    return res.redirect('/index.html');
  }
  delete req.session.pendingSSO;

  const client = getClient(sso.client_id);
  if (!client || !isRedirectUriAllowed(client, sso.redirect_uri)) {
    return res.status(400).send('SSO 파라미터가 유효하지 않습니다.');
  }

  issueCodeAndRedirect(res, req.session.user.id, sso.client_id, sso.redirect_uri, sso.state);
});

// ── 코드 → 유저 정보 교환 ─────────────────────────────────────────────
// POST /api/sso/token
// Body (JSON): { client_id, client_secret, code }
// 외부 사이트 서버가 서버-to-서버로 호출
router.post('/token', (req, res) => {
  const { client_id, client_secret, code } = req.body;
  if (!client_id || !client_secret || !code) {
    return res.status(400).json({ error: 'client_id, client_secret, code 가 필요합니다.' });
  }

  const client = getClient(client_id);
  if (!client || client.secret !== client_secret) {
    return res.status(401).json({ error: '클라이언트 인증 실패' });
  }

  const row = db.prepare('SELECT * FROM sso_codes WHERE code=? AND client_id=?').get(code, client_id);
  if (!row) {
    return res.status(400).json({ error: '유효하지 않은 코드입니다.' });
  }
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sso_codes WHERE code=?').run(code);
    return res.status(400).json({ error: '코드가 만료되었습니다 (5분 초과).' });
  }

  db.prepare('DELETE FROM sso_codes WHERE code=?').run(code);

  const user = db.prepare('SELECT id, email, nickname, role FROM users WHERE id=?').get(row.user_id);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

  res.json({ ok: true, user });
});

// ── 클라이언트 등록 (관리자 전용) ─────────────────────────────────────
// POST /api/sso/clients
// Body: { id, name, redirect_uris: ['https://...'] }
router.post('/clients', requireAdmin, (req, res) => {
  const { id, name, redirect_uris } = req.body;
  if (!id || !name || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return res.status(400).json({ error: 'id, name, redirect_uris(배열) 가 필요합니다.' });
  }
  if (getClient(id)) {
    return res.status(400).json({ error: '이미 등록된 client_id 입니다.' });
  }

  const secret = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sso_clients(id,secret,name,redirect_uris) VALUES(?,?,?,?)')
    .run(id, secret, name, JSON.stringify(redirect_uris));

  res.json({ ok: true, client_id: id, client_secret: secret });
});

// ── 클라이언트 목록 (관리자 전용) ─────────────────────────────────────
// GET /api/sso/clients
router.get('/clients', requireAdmin, (req, res) => {
  const clients = db.prepare('SELECT id, name, redirect_uris, created_at FROM sso_clients').all();
  res.json(clients.map(c => ({ ...c, redirect_uris: JSON.parse(c.redirect_uris) })));
});

module.exports = router;
