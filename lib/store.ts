import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR, DB_FILE, UPLOAD_DIR } from "./env";

/**
 * 로컬 파일 기반 저장소 (v1).
 *
 * 나중에 Supabase 로 옮길 때는 이 파일의 함수 시그니처를 그대로 두고
 * 내부 구현만 DB 호출로 바꾸면 된다. 스키마는 docs/db/0001_init.supabase.sql 참고.
 */

export type Member = {
  id: string;
  displayName: string;
  pinHash: string;
  role: "admin" | "member";
  color: string;
  sessionVersion: number;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /**
   * 조에서의 역할. 위의 role 은 앱 권한(admin/member)이고 이건 가을발표회 편성이다.
   * 멘토와 조원은 겹치지 않는다. null = 아직 안 골랐다.
   */
  groupRole: GroupRole | null;
  /** 속한/맡은 조. 조원은 1개, 멘토는 1개 이상 (겸직하는 멘토가 있다) */
  groupNos: number[];
  /** 홈 튜토리얼을 끝낸 시각 */
  tutorialDoneAt: string | null;
};

export type GroupRole = "mentor" | "member";

/**
 * 필수 튜토리얼을 아직 마치지 않았는지. 역할·조가 비어 있으면(예전 데이터)
 * 튜토리얼을 다시 태운다. 화면 제한과 안내 오버레이가 이 값을 기준으로 붙는다.
 */
export function isInTutorial(member: Member | null): boolean {
  return !member?.tutorialDoneAt || member.groupRole === null;
}

/** class = 시간표에서 읽은 수업 / personal = 사용자가 직접 추가한 개인 불가 시간(알바·통학 등) */
export type BlockKind = "class" | "personal";

export type ScheduleBlock = {
  id: string;
  weekday: number;   // 0=월 … 6=일
  startMin: number;  // 자정 기준 분
  endMin: number;
  title: string;
  confidence: "high" | "low";
  kind: BlockKind;
};

export type Schedule = {
  id: string;
  memberId: string;
  label: string;
  source: "image" | "manual";
  /** uploaded = 이미지 등록만 된 상태(v1 종료 지점) / parsed = 분석 완료(v2) */
  status: "uploaded" | "parsed" | "manual";
  imageFile: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  /** 분석·검토를 마친 수업 블록. status 가 'uploaded' 면 비어 있다. */
  blocks: ScheduleBlock[];
  isActive: boolean;
  createdAt: string;
};

/** 연습 일정. 하나의 개체가 상태만 바꾸며 끝까지 간다. */
export type MeetEvent = {
  id: string;
  createdBy: string;
  title: string;
  status: "polling" | "confirmed" | "cancelled";
  /** 후보 날짜 (KST 기준 "YYYY-MM-DD") */
  dates: string[];
  durationMin: number;
  confirmedDate: string | null;
  /** 자정 기준 분 */
  confirmedStartMin: number | null;
  place: string | null;
  createdAt: string;
};

/** 후보 하나에 대한 멤버의 답. slotKey = `${date}T${startMin}` */
export type EventResponse = {
  eventId: string;
  memberId: string;
  slotKey: string;
  answer: "yes" | "no";
};

type Data = {
  members: Member[];
  schedules: Schedule[];
  events: MeetEvent[];
  responses: EventResponse[];
};

const EMPTY: Data = { members: [], schedules: [], events: [], responses: [] };

async function read(): Promise<Data> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Data>;
    return {
      // 예전 데이터 호환
      members: (parsed.members ?? []).map((m) => {
        // 예전 데이터는 조가 하나(groupNo)뿐이고 역할이 없었다.
        const legacy = (m as { groupNo?: number | null }).groupNo;
        return {
          ...m,
          groupRole: m.groupRole ?? null,
          groupNos: m.groupNos ?? (typeof legacy === "number" ? [legacy] : []),
          tutorialDoneAt: m.tutorialDoneAt ?? null,
        };
      }),
      events: parsed.events ?? [],
      responses: parsed.responses ?? [],
      schedules: (parsed.schedules ?? []).map((s) => ({
        ...s,
        // 예전 데이터 호환: kind 가 없으면 수업으로 본다
        blocks: (s.blocks ?? []).map((b) => ({ ...b, kind: b.kind ?? "class" })),
      })),
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function write(data: Data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // 같은 폴더에 임시 파일로 쓰고 rename — 쓰다 만 JSON 이 남지 않는다
  const tmp = `${DB_FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/**
 * 파일 하나를 통째로 읽고 다시 쓰기 때문에, 두 요청이 겹치면 나중 쓰기가
 * 앞선 변경을 통째로 덮어쓴다 (같은 시각에 답한 두 사람 중 하나가 사라진다).
 * 읽기~쓰기를 한 줄로 세워서 막는다. 프로세스가 하나라 인메모리 잠금으로 충분하고,
 * Supabase 로 옮기면 트랜잭션이 대신하므로 이 헬퍼는 사라진다.
 */
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  // 앞 작업이 실패해도 뒤 작업은 이어서 돌아야 한다
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

// ── 멤버 ──────────────────────────────────────────────────

const COLORS = ["indigo", "rose", "amber", "emerald", "sky", "violet", "orange", "teal"];

export async function listMembers(): Promise<Member[]> {
  const data = await read();
  return data.members
    .filter((m) => m.isActive)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 표시명 비교 규칙 — 앞뒤 공백과 대소문자를 무시한다. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function findMemberByName(displayName: string): Promise<Member | null> {
  const data = await read();
  return data.members.find((m) => m.isActive && sameName(m.displayName, displayName)) ?? null;
}

export async function getMember(id: string): Promise<Member | null> {
  const data = await read();
  return data.members.find((m) => m.id === id) ?? null;
}

/**
 * 표시명이 곧 로그인 아이디다. 확인과 삽입을 잠금 안에서 함께 해야
 * 같은 이름으로 동시에 가입 요청이 들어와도 하나만 통과한다.
 * 이름이 이미 있으면 null.
 */
export async function createMember(
  displayName: string,
  pinHash: string,
): Promise<Member | null> {
  return withLock(async () => {
    const data = await read();
    const name = displayName.trim();
    if (data.members.some((m) => m.isActive && sameName(m.displayName, name))) return null;

    const member: Member = {
      id: randomUUID(),
      displayName: name,
      pinHash,
      role: data.members.length === 0 ? "admin" : "member", // 첫 가입자가 관리자
      color: COLORS[data.members.length % COLORS.length],
      sessionVersion: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      groupRole: null,
      groupNos: [],
      tutorialDoneAt: null,
    };
    data.members.push(member);
    await write(data);
    return member;
  });
}

export async function touchLogin(memberId: string) {
  return withLock(async () => {
    const data = await read();
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return;
    member.lastLoginAt = new Date().toISOString();
    await write(data);
  });
}

// ── 시간표 ────────────────────────────────────────────────

export async function getActiveSchedule(memberId: string): Promise<Schedule | null> {
  const data = await read();
  return data.schedules.find((s) => s.memberId === memberId && s.isActive) ?? null;
}

export async function listActiveSchedules(): Promise<Schedule[]> {
  const data = await read();
  return data.schedules.filter((s) => s.isActive);
}

export async function saveScheduleImage(
  memberId: string,
  bytes: Buffer,
  meta: { width: number; height: number },
): Promise<Schedule> {
  return withLock(async () => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = `${randomUUID()}.jpg`;
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), bytes);

    const data = await read();
    // 기존 시간표는 비활성화 — 항상 최신 1장만 유효
    for (const s of data.schedules) {
      if (s.memberId === memberId) s.isActive = false;
    }
    const schedule: Schedule = {
      id: randomUUID(),
      memberId,
      label: "내 시간표",
      source: "image",
      status: "uploaded",
      imageFile: fileName,
      imageWidth: meta.width,
      imageHeight: meta.height,
      blocks: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    data.schedules.push(schedule);
    await write(data);
    return schedule;
  });
}

/** 업로드된 이미지의 절대 경로. Agent SDK 가 파일을 직접 읽는 데 쓴다. */
export function scheduleImagePath(schedule: Schedule): string | null {
  return schedule.imageFile ? path.join(UPLOAD_DIR, schedule.imageFile) : null;
}

/** 에타 시간표 이미지가 없는 사람을 위해, 빈 시간표를 만들어 직접 입력하게 한다. */
export async function createManualSchedule(memberId: string): Promise<Schedule> {
  return withLock(async () => {
    const data = await read();
    for (const s of data.schedules) {
      if (s.memberId === memberId) s.isActive = false;
    }
    const schedule: Schedule = {
      id: randomUUID(),
      memberId,
      label: "내 시간표",
      source: "manual",
      status: "manual",
      imageFile: null,
      imageWidth: null,
      imageHeight: null,
      blocks: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    data.schedules.push(schedule);
    await write(data);
    return schedule;
  });
}

export async function readScheduleImage(schedule: Schedule): Promise<Buffer | null> {
  if (!schedule.imageFile) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, schedule.imageFile));
  } catch {
    return null;
  }
}

export async function deactivateSchedule(memberId: string) {
  return withLock(async () => {
    const data = await read();
    for (const s of data.schedules) {
      if (s.memberId === memberId) s.isActive = false;
    }
    await write(data);
  });
}

/** 검토를 마친 블록을 저장하고 상태를 parsed 로 올린다. */
export async function saveScheduleBlocks(
  memberId: string,
  blocks: Omit<ScheduleBlock, "id">[],
): Promise<Schedule | null> {
  return withLock(async () => {
    const data = await read();
    const schedule = data.schedules.find((s) => s.memberId === memberId && s.isActive);
    if (!schedule) return null;

    schedule.blocks = blocks.map((b) => ({ ...b, id: randomUUID() }));
    schedule.status = "parsed";
    await write(data);
    return schedule;
  });
}

// ── 연습 일정 ─────────────────────────────────────────────

export async function createEvent(input: {
  createdBy: string;
  title: string;
  dates: string[];
  durationMin: number;
}): Promise<MeetEvent> {
  return withLock(async () => {
    const data = await read();
    const event: MeetEvent = {
      id: randomUUID(),
      createdBy: input.createdBy,
      title: input.title.trim(),
      status: "polling",
      dates: [...input.dates].sort(),
      durationMin: input.durationMin,
      confirmedDate: null,
      confirmedStartMin: null,
      place: null,
      createdAt: new Date().toISOString(),
    };
    data.events.push(event);
    await write(data);
    return event;
  });
}

export async function listEvents(): Promise<MeetEvent[]> {
  const data = await read();
  return data.events
    .filter((e) => e.status !== "cancelled")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEvent(id: string): Promise<MeetEvent | null> {
  const data = await read();
  return data.events.find((e) => e.id === id) ?? null;
}

export async function listResponses(eventId: string): Promise<EventResponse[]> {
  const data = await read();
  return data.responses.filter((r) => r.eventId === eventId);
}

/** 여러 이벤트의 답을 한 번에. 홈에서 이벤트마다 파일을 다시 읽지 않으려고 둔다. */
export async function listResponsesForEvents(eventIds: string[]): Promise<EventResponse[]> {
  const data = await read();
  const want = new Set(eventIds);
  return data.responses.filter((r) => want.has(r.eventId));
}

/** 한 멤버의 답을 통째로 갈아끼운다. */
export async function saveResponses(
  eventId: string,
  memberId: string,
  answers: { slotKey: string; answer: "yes" | "no" }[],
): Promise<void> {
  return withLock(async () => {
    const data = await read();
    data.responses = data.responses.filter(
      (r) => !(r.eventId === eventId && r.memberId === memberId),
    );
    data.responses.push(...answers.map((a) => ({ eventId, memberId, ...a })));
    await write(data);
  });
}

export async function confirmEvent(
  eventId: string,
  date: string,
  startMin: number,
  place: string | null,
): Promise<MeetEvent | null> {
  return withLock(async () => {
    const data = await read();
    const event = data.events.find((e) => e.id === eventId);
    if (!event) return null;
    event.status = "confirmed";
    event.confirmedDate = date;
    event.confirmedStartMin = startMin;
    event.place = place?.trim() || null;
    await write(data);
    return event;
  });
}

export async function cancelEvent(eventId: string): Promise<void> {
  return withLock(async () => {
    const data = await read();
    const event = data.events.find((e) => e.id === eventId);
    if (!event) return;
    event.status = "cancelled";
    await write(data);
  });
}

// ── 홈 튜토리얼 ────────────────────────────────────────────

/**
 * PIN 교체. sessionVersion 을 올려서 기존 로그인을 전부 끊는다 —
 * 다른 기기에 남아 있는 세션도 requireMember() 에서 걸러진다.
 */
export async function changeMemberPin(memberId: string, pinHash: string): Promise<void> {
  return withLock(async () => {
    const data = await read();
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return;
    member.pinHash = pinHash;
    member.sessionVersion += 1;
    await write(data);
  });
}

/**
 * 표시명 변경. 중복 확인도 잠금 안에서 함께 한다 — 확인과 저장 사이에
 * 다른 사람이 같은 이름으로 가입하는 것을 막는다. 이미 쓰는 이름이면 false.
 */
export async function renameMember(memberId: string, displayName: string): Promise<boolean> {
  return withLock(async () => {
    const data = await read();
    const name = displayName.trim();
    const taken = data.members.some(
      (m) => m.id !== memberId && m.isActive && sameName(m.displayName, name),
    );
    if (taken) return false;

    const member = data.members.find((m) => m.id === memberId);
    if (!member) return false;
    member.displayName = name;
    await write(data);
    return true;
  });
}

export async function setMemberGroups(
  memberId: string,
  groupRole: GroupRole,
  groupNos: number[],
): Promise<void> {
  return withLock(async () => {
    const data = await read();
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return;
    member.groupRole = groupRole;
    member.groupNos = [...new Set(groupNos)].sort((a, b) => a - b);
    await write(data);
  });
}

export async function completeTutorial(memberId: string): Promise<void> {
  return withLock(async () => {
    const data = await read();
    const member = data.members.find((m) => m.id === memberId);
    if (!member) return;
    member.tutorialDoneAt = new Date().toISOString();
    await write(data);
  });
}
