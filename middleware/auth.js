function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: '로그인이 필요합니다.' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).json({ error: '관리자만 작성할 수 있는 게시판입니다.' });
}

module.exports = { requireLogin, requireAdmin };
