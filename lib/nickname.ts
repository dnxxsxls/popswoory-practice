/** 랜덤 닉네임 생성 — 밴드·음악 소재로 조합한다. (서버·클라이언트 공용) */

const ADJECTIVES = [
  "신나는", "나른한", "열정적인", "조용한", "통통튀는", "느긋한",
  "반짝이는", "씩씩한", "상냥한", "엉뚱한", "부지런한", "졸린",
  "다정한", "용감한", "수줍은", "느릿한", "폭신한", "말끔한",
];

const NOUNS = [
  "드럼", "베이스", "기타", "건반", "마이크", "앰프",
  "스틱", "메트로놈", "스피커", "튜너", "페달", "리버브",
  "리듬", "멜로디", "하모니", "스네어", "심벌", "코드",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/**
 * @param exclude 직전에 나온 값 — 같은 게 다시 나오지 않게 한 번 더 뽑는다
 */
export function randomNickname(exclude?: string): string {
  for (let i = 0; i < 5; i++) {
    const value = [pick(ADJECTIVES), pick(NOUNS)].join(" ").replace(/\s+/g, " ");
    // 닉네임 최대 12자 제한을 넘지 않고, 직전 값과 다를 때만 채택
    if (value.length <= 12 && value !== exclude) return value;
  }
  return [pick(ADJECTIVES), pick(NOUNS)].join(" ").replace(/\s+/g, " ").slice(0, 12);
}
