/** 팝스우리 가을발표회 조 편성 — 조별 멘토. (서버·클라이언트 공용) */

export type Group = { no: number; mentors: string[] };

export const GROUPS: Group[] = [
  { no: 1, mentors: ["김민겸", "전종호"] },
  { no: 2, mentors: ["송지은", "신해빈"] },
  { no: 3, mentors: ["배현", "오은솔"] },
  { no: 4, mentors: ["조수안", "최유연"] },
  { no: 5, mentors: ["신해빈", "오은솔"] },
  { no: 6, mentors: ["왕유린", "조수안"] },
  { no: 7, mentors: ["배현", "왕유린"] },
  { no: 8, mentors: ["유현준", "주현재"] },
];

export function findGroup(no: number | null): Group | null {
  if (no === null) return null;
  return GROUPS.find((g) => g.no === no) ?? null;
}
