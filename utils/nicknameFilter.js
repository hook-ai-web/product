// 닉네임 금지어 목록
// 공백·특수문자 제거 후 소문자로 정규화해서 비교

const BLOCKED = [
  // 운영자·관리자 사칭
  '운영자', '관리자', '어드민', '스태프', '매니저', '공식', '운영팀',
  '고객센터', '공지', '2막이음', '세컨드링크', 'admin', 'administrator',
  'manager', 'staff', 'official', 'operator', 'moderator', 'mod',

  // 선정적·욕설 (기본)
  '씨발', '시발', '씨팔', '개새끼', '개색끼', '병신', '뻐큐', '보지',
  '자지', '섹스', '섹시', '야동', '야설', '포르노', '변태', '창녀',
  '창년', '매춘', '윤간', '강간', '성기', '페니스', '클리토리스',
  'sex', 'porn', 'fuck', 'shit', 'bitch', 'asshole', 'pussy', 'dick',
  'cock', 'nigger', 'whore',
];

// 정규화: 공백·구분자만 제거(한글 보존), 소문자화
function normalize(str) {
  return str.replace(/[\s\-_.·•*]/g, '').toLowerCase();
}

/**
 * 금지된 닉네임이면 이유 문자열 반환, 통과하면 null
 */
function checkNickname(nickname) {
  const norm = normalize(nickname);
  for (const word of BLOCKED) {
    if (norm.includes(normalize(word))) {
      return `사용할 수 없는 닉네임입니다. (금지어 포함)`;
    }
  }
  return null;
}

module.exports = { checkNickname };
