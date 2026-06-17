const express = require('express');
const db = require('../db/database');

const router = express.Router();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// JSON fetch 헬퍼
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`응답 파싱 실패: ${text.slice(0, 200)}`); }
}

// OAuth 사용자 찾기 또는 생성 — { user, isNew } 반환
function findOrCreateUser(provider, oauthId, email, nickname) {
  // 1. oauth_provider + oauth_id로 조회
  let user = db.prepare('SELECT * FROM users WHERE oauth_provider=? AND oauth_id=?').get(provider, oauthId);
  if (user) return { user, isNew: false };

  // 2. 같은 이메일 계정이 있으면 연동
  if (email) {
    user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (user) {
      db.prepare('UPDATE users SET oauth_provider=?, oauth_id=? WHERE id=?').run(provider, oauthId, user.id);
      return { user: db.prepare('SELECT * FROM users WHERE id=?').get(user.id), isNew: false };
    }
  }

  // 3. 신규 생성 (닉네임은 임시값 — complete-profile에서 확정)
  const tempNickname = (nickname || `${provider}사용자`).slice(0, 20);
  const safeEmail    = email || `${provider}_${oauthId}@oauth.local`;
  const result = db.prepare(
    `INSERT INTO users(email, password_hash, nickname, region, role, oauth_provider, oauth_id, created_at)
     VALUES(?,?,?,?,?,?,?,datetime('now','localtime'))`
  ).run(safeEmail, null, tempNickname, '', 'user', provider, oauthId);

  return { user: db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid), isNew: true };
}

function loginAndRedirect(req, res, user, isNew) {
  if (isNew) {
    // 신규 소셜 사용자 → 프로필 완성 페이지로 (pendingSSO는 세션에 유지)
    req.session.pendingProfile = { userId: user.id, suggestedNickname: user.nickname };
    res.redirect('/complete-profile.html');
    return;
  }
  req.session.user = { id: user.id, email: user.email, nickname: user.nickname, role: user.role };
  // SSO 흐름 중이면 SSO 계속 진행
  if (req.session.pendingSSO) {
    return res.redirect('/api/sso/continue');
  }
  const next = req.session.oauthNext || '/index.html';
  delete req.session.oauthNext;
  res.redirect(next);
}

// ── 카카오 ──────────────────────────────────────────────────────────
router.get('/kakao', (req, res) => {
  if (!process.env.KAKAO_CLIENT_ID || process.env.KAKAO_CLIENT_ID.includes('입력')) {
    return res.redirect('/login.html?error=kakao_not_configured');
  }
  req.session.oauthNext = req.query.next || '/index.html';
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id',    process.env.KAKAO_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${BASE_URL}/auth/kakao/callback`);
  url.searchParams.set('response_type', 'code');
  res.redirect(url.toString());
});

router.get('/kakao/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error || !code) throw new Error('카카오 인증이 취소됐습니다.');

    const token = await fetchJSON('https://kauth.kakao.com/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:   'authorization_code',
        client_id:    process.env.KAKAO_CLIENT_ID,
        redirect_uri: `${BASE_URL}/auth/kakao/callback`,
        code,
      }),
    });

    const profile = await fetchJSON('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const oauthId  = String(profile.id);
    const email    = profile.kakao_account?.email || null;
    const nickname = profile.kakao_account?.profile?.nickname || profile.properties?.nickname || '카카오사용자';

    const { user, isNew } = findOrCreateUser('kakao', oauthId, email, nickname);
    loginAndRedirect(req, res, user, isNew);
  } catch(e) {
    console.error('[카카오 OAuth]', e.message);
    res.redirect('/login.html?error=kakao');
  }
});

// ── 네이버 ──────────────────────────────────────────────────────────
router.get('/naver', (req, res) => {
  if (!process.env.NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID.includes('입력')) {
    return res.redirect('/login.html?error=naver_not_configured');
  }
  const state = Math.random().toString(36).slice(2, 10);
  req.session.oauthState = state;
  req.session.oauthNext  = req.query.next || '/index.html';

  const url = new URL('https://nid.naver.com/oauth2.0/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id',    process.env.NAVER_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${BASE_URL}/auth/naver/callback`);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

router.get('/naver/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error || !code) throw new Error('네이버 인증이 취소됐습니다.');
    if (state !== req.session.oauthState) throw new Error('상태값 불일치');

    const params = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     process.env.NAVER_CLIENT_ID,
      client_secret: process.env.NAVER_CLIENT_SECRET,
      code, state,
    });
    const token = await fetchJSON(`https://nid.naver.com/oauth2.0/token?${params}`);

    const info = await fetchJSON('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const oauthId  = String(info.response.id);
    const email    = info.response.email || null;
    const nickname = info.response.name || info.response.nickname || '네이버사용자';

    const { user, isNew } = findOrCreateUser('naver', oauthId, email, nickname);
    loginAndRedirect(req, res, user, isNew);
  } catch(e) {
    console.error('[네이버 OAuth]', e.message);
    res.redirect('/login.html?error=naver');
  }
});

// ── 구글 ──────────────────────────────────────────────────────────
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('입력')) {
    return res.redirect('/login.html?error=google_not_configured');
  }
  req.session.oauthNext = req.query.next || '/index.html';
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',    process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${BASE_URL}/auth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'email profile');
  res.redirect(url.toString());
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error || !code) throw new Error('구글 인증이 취소됐습니다.');

    const token = await fetchJSON('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${BASE_URL}/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    });

    const profile = await fetchJSON('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const oauthId  = String(profile.id);
    const email    = profile.email || null;
    const nickname = profile.name || '구글사용자';

    const { user, isNew } = findOrCreateUser('google', oauthId, email, nickname);
    loginAndRedirect(req, res, user, isNew);
  } catch(e) {
    console.error('[구글 OAuth]', e.message);
    res.redirect('/login.html?error=google');
  }
});

module.exports = router;
