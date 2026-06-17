/* ======================================================
   2막이음 — 공통 JS
   ====================================================== */

const SECTIONS = {
  life:      { label:'생활정보', icon:'📰',
    boards: [['all','전체'],['health','건강'],['finance','재무·연금'],['travel','여행·여가'],
             ['housing','주거생활'],['family','가족관계'],['digital','디지털생활'],['law','법률·소비자']] },
  learn:     { label:'배움터',   icon:'📚', disabled: true },
  job:       { label:'일자리',   icon:'💼',
    boards: [['startup','창업'],['recruit','채용정보'],['guide','일자리 가이드']] },
  benefit:   { label:'지원혜택', icon:'🎁',
    boards: [['gov','정부지원금'],['welfare','복지혜택'],['care','부모님요양']] },
  community: { label:'커뮤니티', icon:'🤝',
    boards: [['counsel','고민상담소'],['market','따뜻한 장터'],['local','우리 동네 소식'],['talent','생활의 지혜'],['daily','일상 공유'],['second','인생2막준비']] },
};

/* ── 헤더 주입 ─────────────────────────────── */
function buildHeader() {
  const header = document.createElement('header');
  header.id = 'site-header';
  header.innerHTML = `
    <div class="header-inner">
      <a href="/index.html" class="logo" aria-label="2막이음 홈">
        <img src="/icons/2mak_ieum_logo.svg" alt="2막이음" style="height:48px;width:auto">
      </a>
      <div class="header-search">
        <button class="search-trigger" onclick="location.href='/search.html?q='" aria-label="검색">
          <i class="ti ti-search" aria-hidden="true"></i>
          <span>검색어를 입력하세요</span>
        </button>
      </div>
      <div id="header-actions" class="header-actions"></div>
      <button id="nav-toggle" aria-label="메뉴 열기" onclick="document.getElementById('main-nav').classList.toggle('open')">
        <i class="ti ti-menu-2"></i>
      </button>
    </div>`;

  const nav = document.createElement('nav');
  nav.id = 'main-nav';
  nav.setAttribute('aria-label', '주 메뉴');

  let navHtml = '<div class="nav-inner">';
  Object.entries(SECTIONS).forEach(([key, sec]) => {
    if (key === 'learn') {
      navHtml += `<div class="nav-item">
        <span class="nav-disabled" title="준비중">${sec.icon} ${sec.label} <small style="font-size:.7em;opacity:.7;font-weight:400">준비중</small></span></div>`;
    } else if (key === 'community') {
      let ddHtml = sec.boards.map(([b, label]) =>
        `<a href="/board.html?section=${key}&board=${b}">${label}</a>`
      ).join('');
      navHtml += `<div class="nav-item">
        <a href="/community.html">${sec.icon} ${sec.label}</a>
        <div class="dropdown" role="menu">${ddHtml}</div></div>`;
    } else {
      let ddHtml = sec.boards.map(([b, label]) =>
        `<a href="/board.html?section=${key}&board=${b}">${label}</a>`
      ).join('');
      navHtml += `<div class="nav-item">
        <a href="/board.html?section=${key}&board=all">${sec.icon} ${sec.label}</a>
        <div class="dropdown" role="menu">${ddHtml}</div></div>`;
    }
  });
  navHtml += '</div>';
  nav.innerHTML = navHtml;

  document.body.prepend(nav);
  document.body.prepend(header);
}

/* ── 푸터 주입 ─────────────────────────────── */
function buildFooter() {
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-cols">

        <!-- 고객센터 -->
        <div>
          <div class="footer-cs-head">고객센터</div>
          <ul class="footer-cs-list">
            <li>운영시간: 평일 10:00 ~ 17:00</li>
            <li>점심시간: 12:00 ~ 13:00</li>
            <li>휴무: 토·일·공휴일</li>
          </ul>
          <a href="mailto:s2condlink@gmail.com" class="footer-email-btn">이메일 문의</a>
        </div>

        <!-- 사이트 링크 -->
        <div class="footer-nav-col">
          <a href="/about.html">회사소개</a>
          <a href="/terms.html">이용약관</a>
          <a href="/privacy.html">개인정보처리방침</a>
          <a href="/notices.html">공지사항</a>
        </div>

        <!-- 사업자 정보 (사업자 등록 후 수정) -->
        <div>
          <button class="biz-info-toggle" onclick="toggleBizInfo(this)" aria-expanded="false">
            <span>(주)세컨드링크</span>
            <i class="ti ti-chevron-down biz-chevron"></i>
          </button>
          <div class="biz-info-body">
            <p class="biz-text">
              세컨드링크 &nbsp;|&nbsp; 대표: 전현민<br>
              경기도 용인시 기흥구 동백중앙로 203, (미주타운) 7층 703-11호 &nbsp;|&nbsp; <a href="mailto:s2condlink@gmail.com">s2condlink@gmail.com</a><br>
              사업자등록번호: [000-00-00000] &nbsp;<a href="#" class="biz-link">사업자정보확인</a><br>
              통신판매업신고번호: 제[0000-서울00-0000]호
            </p>
          </div>
        </div>

      </div>

      <div class="footer-bottom">
        <span>© 2026. secondlink All rights reserved.</span>
      </div>
    </div>`;
  document.body.append(footer);
}

/* ── 세션 반영 ─────────────────────────────── */
async function loadSession() {
  try {
    const { loggedIn, user } = await api('/api/auth/me');
    const el = document.getElementById('header-actions');
    if (!el) return;
    if (loggedIn) {
      el.innerHTML = `
        <span id="header-user-name" class="hdr-desk-only">${user.nickname}님</span>
        <a href="/mypage.html" class="hdr-desk-only">마이페이지</a>
        <button onclick="logout()" class="hdr-desk-only">로그아웃</button>
        <div class="hdr-user-menu hdr-mob-only" id="hdr-user-menu">
          <button class="hdr-user-btn" onclick="toggleUserMenu(event)" aria-label="내 메뉴">
            <i class="ti ti-user-circle"></i>
          </button>
          <div class="hdr-user-drop" id="hdr-user-drop">
            <span class="um-nick">${user.nickname}님</span>
            <a href="/mypage.html"><i class="ti ti-user" style="margin-right:.35rem"></i>마이페이지</a>
            <button onclick="logout()"><i class="ti ti-logout" style="margin-right:.35rem"></i>로그아웃</button>
          </div>
        </div>`;
      window._user = user;
    } else {
      el.innerHTML = `<a href="/login.html">로그인</a><a href="/register.html">회원가입</a>`;
      window._user = null;
    }
  } catch(e) {}
}

function toggleUserMenu(e) {
  e.stopPropagation();
  const drop = document.getElementById('hdr-user-drop');
  if (drop) drop.classList.toggle('open');
}

document.addEventListener('click', () => {
  const drop = document.getElementById('hdr-user-drop');
  if (drop) drop.classList.remove('open');
});

function toggleBizInfo(btn) {
  const body = btn.nextElementSibling;
  const chevron = btn.querySelector('.biz-chevron');
  const open = body.classList.toggle('open');
  if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
}

async function logout() {
  await api('/api/auth/logout', { method:'POST' });
  location.href = '/index.html';
}

/* ── API 래퍼 ───────────────────────────────── */
async function api(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(url, {
    ...options,
    headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    body: (!isFormData && options.body && typeof options.body === 'object')
      ? JSON.stringify(options.body)
      : options.body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.');
  return data;
}

/* ── 토스트 ─────────────────────────────────── */
function showToast(msg, duration = 2500) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ── 날짜 포맷 ─────────────────────────────── */
function fmtDate(str) {
  if (!str) return '';
  return str.replace('T', ' ').slice(0, 16);
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr.replace(' ','T')).getTime()) / 60000;
  if (diff < 1)    return '방금 전';
  if (diff < 60)   return Math.floor(diff) + '분 전';
  if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
  return Math.floor(diff / 1440) + '일 전';
}

/* ── 초기화 ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildHeader();
  buildFooter();
  loadSession();
});
