const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const db = require('../db/database');
const { checkNickname } = require('../utils/nicknameFilter');

const router = express.Router();

// 인증 코드 임시 저장 (email → { code, expires, verified })
const verifyCodes = new Map();

function createTransport() {
  if (!process.env.EMAIL_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendVerificationEmail(email, code) {
  const transport = createTransport();
  if (!transport) {
    // 개발 모드: 콘솔 출력
    console.log(`\n[이메일 인증 코드] ${email} → ${code}\n`);
    return;
  }
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: '[2막이음] 이메일 인증 코드',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#e8702a">2막이음 이메일 인증</h2>
        <p>아래 인증 코드를 입력해주세요. 유효 시간은 10분입니다.</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:.3em;color:#333;margin:1.5rem 0">${code}</div>
      </div>
    `,
  });
}

// 인증 코드 발송
router.post('/send-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '이메일을 입력해주세요.' });

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verifyCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000, verified: false });

  try {
    await sendVerificationEmail(email, code);
    res.json({ ok: true });
  } catch (e) {
    console.error('이메일 발송 오류:', e);
    res.status(500).json({ error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// 인증 코드 확인
router.post('/check-verification', (req, res) => {
  const { email, code } = req.body;
  const record = verifyCodes.get(email);
  if (!record) return res.status(400).json({ error: '인증 코드가 없습니다. 다시 요청해주세요.' });
  if (Date.now() > record.expires) {
    verifyCodes.delete(email);
    return res.status(400).json({ error: '인증 코드가 만료되었습니다. 다시 요청해주세요.' });
  }
  if (record.code !== code) return res.status(400).json({ error: '인증 코드가 올바르지 않습니다.' });
  record.verified = true;
  res.json({ ok: true });
});

// 회원가입
router.post('/register', (req, res) => {
  const { email, password, nickname, phone } = req.body;
  if (!email || !password || !nickname) {
    return res.status(400).json({ error: '필수 항목을 입력해주세요.' });
  }

  // 이메일 인증 확인
  const record = verifyCodes.get(email);
  if (!record || !record.verified) {
    return res.status(400).json({ error: '이메일 인증을 완료해주세요.' });
  }

  // 비밀번호 규칙: 영문+숫자 포함 8자 이상
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: '비밀번호는 영문, 숫자를 포함한 8자 이상이어야 합니다.' });
  }

  // 닉네임 2~20자
  if (nickname.length < 2 || nickname.length > 20) {
    return res.status(400).json({ error: '닉네임은 2~20자로 입력해주세요.' });
  }
  const nickErr = checkNickname(nickname);
  if (nickErr) return res.status(400).json({ error: nickErr });

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });

  const nickDup = db.prepare('SELECT id FROM users WHERE nickname=?').get(nickname);
  if (nickDup) return res.status(400).json({ error: '이미 사용 중인 닉네임입니다.' });

  const hash = bcrypt.hashSync(password, 8);
  const result = db.prepare(
    'INSERT INTO users(email,password_hash,nickname,phone) VALUES(?,?,?,?)'
  ).run(email, hash, nickname, phone || '');

  verifyCodes.delete(email);

  req.session.user = { id: result.lastInsertRowid, nickname, role: 'user' };
  res.json({ ok: true, nickname });
});

// 소셜 로그인 후 프로필 완성
router.get('/pending-profile', (req, res) => {
  if (!req.session.pendingProfile) return res.json({ pending: false });
  res.json({ pending: true, suggestedNickname: req.session.pendingProfile.suggestedNickname });
});

router.post('/complete-profile', (req, res) => {
  const pending = req.session.pendingProfile;
  if (!pending) return res.status(400).json({ error: '잘못된 접근입니다.' });

  const { nickname, phone } = req.body;
  if (!nickname || nickname.length < 2 || nickname.length > 20) {
    return res.status(400).json({ error: '닉네임은 2~20자로 입력해주세요.' });
  }
  const nickErr = checkNickname(nickname);
  if (nickErr) return res.status(400).json({ error: nickErr });

  const nickDup = db.prepare('SELECT id FROM users WHERE nickname=? AND id!=?').get(nickname, pending.userId);
  if (nickDup) return res.status(400).json({ error: '이미 사용 중인 닉네임입니다.' });

  db.prepare('UPDATE users SET nickname=?, phone=? WHERE id=?').run(nickname, phone || '', pending.userId);

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(pending.userId);
  delete req.session.pendingProfile;
  req.session.user = { id: user.id, email: user.email, nickname: user.nickname, role: user.role };
  const ssoRedirect = req.session.pendingSSO ? '/api/sso/continue' : null;
  res.json({ ok: true, nickname: user.nickname, ssoRedirect });
});

// 로그인
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  }
  if (user.deleted_at) {
    return res.status(401).json({ error: '탈퇴한 계정입니다.' });
  }
  req.session.user = { id: user.id, nickname: user.nickname, region: user.region, role: user.role };
  const ssoRedirect = req.session.pendingSSO ? '/api/sso/continue' : null;
  res.json({ ok: true, nickname: user.nickname, ssoRedirect });
});

// 로그아웃
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// 세션 정보
router.get('/me', (req, res) => {
  if (req.session.user) res.json({ loggedIn: true, user: req.session.user });
  else res.json({ loggedIn: false });
});

// 내 프로필 조회
router.get('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const user = db.prepare('SELECT id, email, nickname, phone, role, oauth_provider FROM users WHERE id=?').get(req.session.user.id);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  res.json(user);
});

// 내 프로필 수정 (닉네임, 휴대폰)
router.put('/profile', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { nickname, phone } = req.body;

  if (nickname !== undefined) {
    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ error: '닉네임은 2~20자로 입력해주세요.' });
    }
    const nickErr = checkNickname(nickname);
    if (nickErr) return res.status(400).json({ error: nickErr });
    const dup = db.prepare('SELECT id FROM users WHERE nickname=? AND id!=?').get(nickname, req.session.user.id);
    if (dup) return res.status(400).json({ error: '이미 사용 중인 닉네임입니다.' });
    db.prepare('UPDATE users SET nickname=? WHERE id=?').run(nickname, req.session.user.id);
    req.session.user.nickname = nickname;
  }

  if (phone !== undefined) {
    db.prepare('UPDATE users SET phone=? WHERE id=?').run(phone, req.session.user.id);
  }

  res.json({ ok: true });
});

// 내가 쓴 글 목록
router.get('/my-posts', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  const id = req.session.user.id;
  const total = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE user_id=?').get(id).cnt;
  const rows = db.prepare(`
    SELECT id, section, board, title, is_anonymous, view_count, created_at
    FROM posts WHERE user_id=?
    ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(id, Number(limit), Number(offset));
  res.json({ total, page: Number(page), limit: Number(limit), rows });
});

// 회원 탈퇴 (소프트 삭제)
router.delete('/account', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: '로그인이 필요합니다.' });
  const { reason } = req.body;
  const id = req.session.user.id;

  db.prepare(`
    UPDATE users SET
      deleted_at = datetime('now','localtime'),
      withdrawal_reason = ?,
      nickname = '탈퇴한 회원',
      email = '탈퇴_' || id || '@deleted.local',
      password_hash = NULL,
      oauth_provider = NULL,
      oauth_id = NULL
    WHERE id = ?
  `).run(reason || null, id);

  req.session.destroy();
  res.json({ ok: true });
});

module.exports = router;
