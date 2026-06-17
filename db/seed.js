/**
 * 더미 데이터 주입 — npm run seed
 * 이미 데이터가 있으면 재실행해도 중복 삽입 안 됨 (users 이메일 유니크)
 */
const bcrypt = require('bcrypt');
const db = require('./database');

const HASH = bcrypt.hashSync('pass1234', 8);

// 사용자
const USERS = [
  { email: 'admin@2makeum.kr', password_hash: HASH, nickname: '운영자', region: '서울', role: 'admin' },
  { email: 'kim@test.kr',      password_hash: HASH, nickname: '김철수', region: '부산', role: 'user'  },
  { email: 'lee@test.kr',      password_hash: HASH, nickname: '이영희', region: '대구', role: 'user'  },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users(email,password_hash,nickname,region,role) VALUES(?,?,?,?,?)'
);
USERS.forEach(u => insertUser.run(u.email, u.password_hash, u.nickname, u.region, u.role));

// 게시글 더미
const POSTS = [
  // 생활정보
  { section:'life', board:'health',  title:'무릎 통증, 이 운동 꼭 해보세요',       content:'50대 이후 무릎 건강을 위한 스트레칭 5가지를 소개합니다. 매일 10분만 투자하면 효과를 느낄 수 있어요.', user_id:2 },
  { section:'life', board:'finance', title:'국민연금 수령액 늘리는 3가지 방법',    content:'임의계속가입, 연기연금, 추납 제도를 활용하면 수령액을 최대 36%까지 늘릴 수 있습니다.', user_id:2 },
  { section:'life', board:'travel',  title:'시니어 우대 기차 할인 총정리',          content:'코레일 경로 우대, 시니어 패스, 주중 할인 등 60세 이상이 알아야 할 철도 혜택을 모았습니다.', user_id:3 },
  { section:'life', board:'housing', title:'임대차 보호법 2024 개정 핵심 정리',    content:'전세사기 예방을 위한 임대차 보호법 개정 내용과 확인 방법을 설명합니다.', user_id:1 },
  { section:'life', board:'family',  title:'성인 자녀와 건강하게 대화하는 법',      content:'심리상담사가 알려주는 세대 간 갈등을 줄이는 대화법 10가지입니다.', user_id:3 },
  { section:'life', board:'digital', title:'카카오뱅크 어플 설치부터 송금까지',     content:'스마트폰 뱅킹이 처음인 분들을 위해 단계별 사진으로 쉽게 설명합니다.', user_id:2 },
  { section:'life', board:'law',     title:'소비자 분쟁 발생 시 신고 방법',        content:'1372 소비자상담센터, 한국소비자원 신청 절차를 안내합니다.', user_id:1 },

  // 일자리
  { section:'job', board:'startup',  title:'퇴직 후 소자본 창업 성공 사례 5선',    content:'100만원 미만으로 시작해 월 300만원 수익을 올리는 창업 사례를 소개합니다.', user_id:2 },
  { section:'job', board:'recruit',  title:'[채용] 관리사무소 경비원 모집 (서울)',  content:'서울 강남구 아파트 관리사무소에서 경비원을 모집합니다. 경력 무관, 65세 이하.', user_id:3 },
  { section:'job', board:'guide',    title:'50대 이직 성공 전략 A to Z',           content:'헤드헌터가 알려주는 중장년 이직 준비부터 면접까지 완벽 가이드입니다.', user_id:1 },

  // 지원혜택
  { section:'benefit', board:'gov',     title:'2024 중장년 직업훈련 바우처 신청 방법', content:'고용노동부 직업훈련 바우처 200만원, 신청 자격과 절차를 안내합니다.', user_id:1 },
  { section:'benefit', board:'welfare', title:'기초연금 신청 자격과 금액 완전 정리',  content:'2024년 기초연금 선정기준액, 신청 방법, 수령 시기를 한눈에 정리했습니다.', user_id:1 },

  // 커뮤니티 - 고민상담소 (익명)
  { section:'community', board:'counsel', title:'남편이 은퇴 후 너무 집에만 있어요', content:'은퇴한 남편이 종일 집에 있으니 숨이 막힙니다. 어떻게 대화해야 할까요?', user_id:2, is_anonymous:1 },
  { section:'community', board:'counsel', title:'자꾸 깊은 잠을 못 자서 걱정이에요', content:'새벽 3시에 깨서 다시 못 자는 게 몇 달째 계속됩니다. 병원을 가야 할까요?', user_id:3, is_anonymous:1 },
  { section:'community', board:'counsel', title:'노후 자금이 2억인데 충분할까요',     content:'62세 자영업자입니다. 은퇴를 고민 중인데 저축이 2억이면 부족한지 여쭤봅니다.', user_id:2, is_anonymous:1 },

  // 커뮤니티 - 중고거래
  { section:'community', board:'market', title:'[팝니다] 삼성 65인치 TV 거의 새것', content:'이사로 인해 팝니다. 2023년 구입, 사용 6개월. 직거래 희망.', user_id:2, trade_type:'팝니다', price:450000, region:'서울' },
  { section:'community', board:'market', title:'[삽니다] 경운기 또는 소형 트랙터',  content:'텃밭 농사용으로 소형 경운기 구합니다. 부산/경남 지역.', user_id:3, trade_type:'삽니다', price:0, region:'부산' },
  { section:'community', board:'market', title:'[나눔] 한국사 능력검정 교재 1~3급', content:'합격 후 필요 없어서 나눔합니다. 직접 수령 가능하신 분만.', user_id:2, trade_type:'나눔', price:0, region:'대구' },

  // 커뮤니티 - 재능기부
  { section:'community', board:'talent', title:'[생활꿀팁] 전기세 50% 줄이는 방법', content:'30년 넘게 전기기사로 일한 경험으로 가정용 절전 팁을 공유합니다.', user_id:2 },
  { section:'community', board:'talent', title:'[지역가이드] 부산 맛집·의원 정보',  content:'부산 30년 거주민이 알려주는 진짜 부산 맛집과 좋은 의원 리스트입니다.', user_id:3 },
  { section:'community', board:'talent', title:'[컨설팅] 무료 재무 상담 해드립니다', content:'20년 은행원 출신으로 은퇴 준비 재무 상담 무료로 해드립니다.', user_id:2 },

  // 지원혜택 - 부모님요양
  { section:'benefit', board:'care', title:'장기요양등급 신청 방법 A to Z',        content:'1~5등급 판정 기준과 신청 절차, 필요 서류를 한눈에 정리했습니다. 국민건강보험공단에 방문 없이 온라인 신청도 가능합니다.', user_id:1 },
  { section:'benefit', board:'care', title:'집에서 돌보는 재가요양 vs 요양원 비교',  content:'어머니를 모시는 방법, 재가요양(방문요양·주야간보호)과 요양원의 비용과 장단점을 비교 정리합니다.', user_id:2 },
  { section:'benefit', board:'care', title:'치매 가족 지원 프로그램 총정리 2024',   content:'치매안심센터 무료 검진, 치매 가족 쉼터, 치료비 지원 등 놓치기 쉬운 혜택을 모았습니다.', user_id:1 },
  { section:'benefit', board:'care', title:'요양보호사 자격증 취득 후기 & 비용 안내', content:'60세에 요양보호사 자격증을 취득한 후기입니다. 수강료·시험 합격률·취업처까지 솔직하게 공유해요.', user_id:3 },

  // 커뮤니티 - 일상나눔
  { section:'community', board:'daily', title:'오늘 텃밭에서 수확한 오이입니다 🥒',  content:'주말 농장에서 오이를 한 박스 수확했습니다. 올해 첫 수확이라 너무 기쁘네요!', user_id:3 },
  { section:'community', board:'daily', title:'좋은 아침입니다 ☀️ 오늘의 명언',     content:'"나이를 먹는 게 아니라 나이가 드는 것이다." — 오늘 하루도 건강하고 행복하게 보내세요.', user_id:1 },
  { section:'community', board:'daily', title:'어제 손녀랑 찍은 사진 자랑이요',     content:'손녀가 할머니 따라 시장 나들이를 했는데 너무 귀여워서 자랑합니다 😄', user_id:3 },
];

const insertPost = db.prepare(`
  INSERT INTO posts(user_id,section,board,title,content,is_anonymous,region,trade_type,price)
  VALUES(?,?,?,?,?,?,?,?,?)
`);

// 이미 게시글이 있으면 시드 건너뜀
const existing = db.prepare('SELECT COUNT(*) as cnt FROM posts').get();
if (existing.cnt === 0) {
  POSTS.forEach(p => {
    insertPost.run(
      p.user_id, p.section, p.board, p.title, p.content,
      p.is_anonymous ?? 0, p.region ?? '', p.trade_type ?? '', p.price ?? 0
    );
  });
  console.log(`게시글 ${POSTS.length}개 삽입 완료`);
} else {
  console.log('이미 게시글 데이터가 있습니다. 스킵.');
}

// 강좌
const COURSES = [
  { type:'online', title:'스마트폰 완전 정복', description:'기초부터 배우는 안드로이드·아이폰 활용법', provider:'2막이음 아카데미', thumbnail:'', link:'#' },
  { type:'online', title:'유튜브로 돈 버는 법', description:'60대 유튜버가 알려주는 채널 운영 비법', provider:'실버크리에이터', thumbnail:'', link:'#' },
  { type:'online', title:'엑셀 기초 마스터', description:'직장에서 바로 쓰는 엑셀 핵심 기능', provider:'디지털교육원', thumbnail:'', link:'#' },
  { type:'cert',   title:'한국사능력검정시험', description:'1~3급 합격 전략 & 기출 풀이', provider:'한국사연구원', thumbnail:'', link:'#' },
  { type:'cert',   title:'요양보호사 자격증', description:'이론·실기 완벽 대비 온라인 강의', provider:'복지아카데미', thumbnail:'', link:'#' },
  { type:'cert',   title:'조리사 자격증 (한식)', description:'한식조리기능사 단기 합격 과정', provider:'요리학원', thumbnail:'', link:'#' },
  { type:'hobby',  title:'수채화 입문 클래스', description:'붓 잡는 법부터 풍경화까지', provider:'실버아트', thumbnail:'', link:'#' },
  { type:'hobby',  title:'기타 통기타 왕초보 과정', description:'코드 3개로 노래 10곡 마스터', provider:'음악교실', thumbnail:'', link:'#' },
  { type:'hobby',  title:'건강 요가 & 명상', description:'관절 건강을 위한 시니어 요가', provider:'건강센터', thumbnail:'', link:'#' },
  { type:'hobby',  title:'스마트팜 텃밭 가꾸기', description:'베란다·주말농장 채소 재배 완전 가이드', provider:'도시농업센터', thumbnail:'', link:'#' },
];

const insertCourse = db.prepare(
  'INSERT INTO courses(type,title,description,provider,thumbnail,link) VALUES(?,?,?,?,?,?)'
);
const existingCourse = db.prepare('SELECT COUNT(*) as cnt FROM courses').get();
if (existingCourse.cnt === 0) {
  COURSES.forEach(c => insertCourse.run(c.type, c.title, c.description, c.provider, c.thumbnail, c.link));
  console.log(`강좌 ${COURSES.length}개 삽입 완료`);
} else {
  console.log('이미 강좌 데이터가 있습니다. 스킵.');
}

// 소모임
const MEETUPS = [
  { name: '아침 걷기 모임',     category: '운동',    emoji: '🚶', location: '서울 강남구',  member_count: 12, is_recruiting: 1 },
  { name: '60+ 기타 동아리',   category: '음악/악기', emoji: '🎸', location: '서울 마포구',  member_count: 8,  is_recruiting: 1 },
  { name: '반려견 산책 친구',   category: '반려동물', emoji: '🐕', location: '경기 성남시',  member_count: 21, is_recruiting: 0 },
  { name: '시니어 제주 한달살기', category: '여행',   emoji: '✈️', location: '제주',         member_count: 6,  is_recruiting: 1 },
  { name: '수채화 취미 모임',   category: '취미/오락', emoji: '🎨', location: '서울 용산구', member_count: 9,  is_recruiting: 1 },
  { name: '건강 밥상 요리교실', category: '음식/음료', emoji: '🍱', location: '부산 해운대구', member_count: 15, is_recruiting: 0 },
  { name: '스마트폰 공부방',   category: '자기개발', emoji: '📱', location: '대구 수성구',  member_count: 11, is_recruiting: 1 },
  { name: '동네 텃밭 모임',    category: '취미/오락', emoji: '🌱', location: '경기 고양시',  member_count: 18, is_recruiting: 1 },
];

const insertMeetup = db.prepare(
  'INSERT INTO meetups(name,category,emoji,location,member_count,is_recruiting) VALUES(?,?,?,?,?,?)'
);
const existingMeetup = db.prepare('SELECT COUNT(*) as cnt FROM meetups').get();
if (existingMeetup.cnt === 0) {
  MEETUPS.forEach(m => insertMeetup.run(m.name, m.category, m.emoji, m.location, m.member_count, m.is_recruiting));
  console.log(`소모임 ${MEETUPS.length}개 삽입 완료`);
} else {
  console.log('이미 소모임 데이터가 있습니다. 스킵.');
}

// 반응 더미 (고민상담소 post id 13~15)
const insertReaction = db.prepare('INSERT OR IGNORE INTO reactions(post_id,user_id,type) VALUES(?,?,?)');
const existingReaction = db.prepare('SELECT COUNT(*) as cnt FROM reactions').get();
if (existingReaction.cnt === 0) {
  const reactionData = [
    [13,1,'tadak'],[13,2,'tadak'],[13,3,'tadak'],   // 토닥토닥 3
    [13,1,'fighting'],[13,2,'fighting'],              // 힘내세요 2
    [13,3,'sad'],                                     // 속상해요 1
    [14,1,'tadak'],[14,2,'tadak'],
    [14,1,'fighting'],[14,3,'fighting'],[14,2,'fighting'],
    [14,1,'sad'],[14,3,'sad'],
    [15,1,'tadak'],[15,2,'tadak'],[15,3,'tadak'],
    [15,2,'fighting'],
    [15,1,'sad'],[15,2,'sad'],[15,3,'sad'],
  ];
  reactionData.forEach(([postId, userId, type]) => insertReaction.run(postId, userId, type));
  console.log('반응 더미 데이터 삽입 완료');
} else {
  console.log('이미 반응 데이터가 있습니다. 스킵.');
}

console.log('시드 완료');
process.exit(0);
