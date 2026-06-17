# 2막이음 — 인생 2막 종합 플랫폼 ROADMAP

> 중장년·시니어의 인생 2막을 위한 **정보 + 배움 + 일자리 + 지원혜택 + 커뮤니티** 통합 플랫폼

---

## 🗺️ 사이트맵

| 대메뉴 | 세부 게시판 |
|---|---|
| 📰 **생활정보** | 전체 · 건강 · 재무·연금 · 여행·여가 · 주거생활 · 가족관계 · 디지털생활 · 법률·소비자 |
| 📚 **배움터** | 온라인강의 · 자격증 · 취미강좌 *(PC 2열 / 모바일 1열 카드 그리드)* |
| 💼 **일자리** | 창업 · 채용정보 · 일자리 가이드 |
| 🎁 **지원혜택** | 정부지원금 · 복지혜택 |
| 🤝 **커뮤니티** | 고민상담소(익명) · 중고거래(지역·유형) · 재능기부 · 일상나눔 |

---

## 🛠 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프론트엔드 | HTML5 + CSS3 + Vanilla JS | 프레임워크 없이 접근 장벽 최소화, 시니어 친화 |
| 백엔드 | Node.js + Express | 경량·빠른 구성 |
| DB | SQLite (`node:sqlite` 내장) | 무설치, 파일 기반, 외부 의존 없음 |
| 인증 | express-session + bcrypt | 세션 기반 단순 인증 |
| 파일 업로드 | multer | 이미지 첨부 (중고거래, 일상나눔) |

---

## 📁 폴더 구조

```
2막이음/
├── ROADMAP.md            # 이 파일
├── CLAUDE.md             # 개발 행동 지침
├── package.json
├── server.js             # Express 엔트리, API 라우팅 + 정적 서빙
├── db/
│   ├── database.js       # SQLite 연결 (node:sqlite 내장)
│   ├── schema.sql        # 테이블 정의
│   └── seed.js           # 더미데이터 주입
├── routes/
│   ├── auth.js           # 회원가입·로그인·세션
│   ├── posts.js          # 게시글 CRUD + 이미지 업로드
│   ├── comments.js       # 댓글
│   └── courses.js        # 배움터 강좌
├── middleware/
│   └── auth.js           # 로그인 필요 라우트 가드
└── public/
    ├── index.html        # 홈
    ├── board.html        # 게시판 목록 (?section=&board=)
    ├── post.html         # 글 상세 (?id=)
    ├── write.html        # 글 작성·수정
    ├── courses.html      # 배움터 카드 그리드
    ├── login.html
    ├── register.html
    ├── mypage.html
    ├── search.html       # 통합 검색 결과
    ├── css/common.css    # 디자인 시스템 (시니어 친화)
    ├── js/common.js      # 헤더·네비·세션·API 래퍼 공통
    └── uploads/          # 업로드 이미지 저장
```

> 게시판 20여 개를 `board.html` 하나에 쿼리스트링(`?section=&board=`)으로 구동해 파일 수 최소화

---

## 🗄 데이터 모델

| 테이블 | 주요 컬럼 |
|---|---|
| `users` | id, email(unique), password_hash, nickname, region, role |
| `posts` | id, user_id, section, board, title, content, is_anonymous, region, trade_type, price, view_count |
| `comments` | id, post_id, user_id, content, is_anonymous |
| `images` | id, post_id, file_path |
| `courses` | id, type(online/cert/hobby), title, description, provider, link |
| `likes` | user_id, post_id (PK 복합) |

---

## 🚀 구현 마일스톤

### ✅ Phase 0 — 프로젝트 셋업 *[완료]*
- package.json, 의존성 설치
- schema.sql, database.js, seed.js

### ✅ Phase 1 — 공통 UI / 시니어 친화 디자인 *[완료]*
- css/common.css: 글씨 ≥18px, 고대비, 넉넉한 여백·터치영역
- 공통 헤더·5대 메뉴 네비(드롭다운)·푸터 (js/common.js)
- index.html 홈: 섹션 카드 + 최신글 미리보기

### ✅ Phase 2 — 인증 *[완료]*
- 회원가입(이메일·비번·닉네임·지역), 로그인/로그아웃, 세션
- mypage.html, middleware/auth.js

### ✅ Phase 3 — 게시판 핵심 CRUD *[완료]*
- posts.js: 목록(페이지네이션)·상세(조회수)·작성·수정·삭제
- board.html / post.html / write.html 연동, 댓글

### ✅ Phase 4 — 커뮤니티 특화 *[완료]*
- 고민상담소: is_anonymous 익명 처리
- 중고거래: 지역·유형 필터, 가격, 이미지 업로드 (multer)
- 재능기부 / 일상나눔 이미지 업로드

### ✅ Phase 5 — 배움터 *[완료]*
- courses.html: CSS Grid 2열(PC) / 1열(모바일) 카드
- 온라인강의·자격증·취미 탭 필터

### ✅ Phase 6 — 검색·마무리 *[완료]*
- 통합 검색 (/api/search, search.html)
- 시드 더미데이터 (게시글 23건, 강좌 10건)

---

## 🔜 다음 단계 (선택적 개선)

| 우선순위 | 작업 |
|---|---|
| 높음 | 이미지 썸네일 미리보기 (중고거래 목록에 이미지 표시) |
| 높음 | 내가 쓴 글 목록 (마이페이지 user_id 필터 API) |
| 중간 | 카카오/네이버 소셜 로그인 |
| 중간 | 좋아요·북마크 기능 |
| 중간 | 관리자 페이지 (게시글·회원 관리) |
| 낮음 | PostgreSQL 이전 (트래픽 증가 시) |
| 낮음 | 배포: Railway / Fly.io |

---

## ▶️ 빠른 시작

```bash
# 의존성 설치
npm install

# 더미데이터 주입 (최초 1회)
npm run seed

# 서버 시작
npm start
# → http://localhost:3000
```

**테스트 계정** (seed 후 사용 가능)
| 이메일 | 비밀번호 | 닉네임 | 권한 |
|---|---|---|---|
| admin@2makeum.kr | pass1234 | 운영자 | 관리자 |
| kim@test.kr | pass1234 | 김철수 | 일반 |
| lee@test.kr | pass1234 | 이영희 | 일반 |
