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
};

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
      members: parsed.members ?? [],
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

// ── 멤버 ──────────────────────────────────────────────────

const COLORS = ["indigo", "rose", "amber", "emerald", "sky", "violet", "orange", "teal"];

export async function listMembers(): Promise<Member[]> {
  const data = await read();
  return data.members
    .filter((m) => m.isActive)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findMemberByName(displayName: string): Promise<Member | null> {
  const data = await read();
  const key = displayName.trim().toLowerCase();
  return data.members.find((m) => m.displayName.toLowerCase() === key && m.isActive) ?? null;
}

export async function getMember(id: string): Promise<Member | null> {
  const data = await read();
  return data.members.find((m) => m.id === id) ?? null;
}

export async function createMember(displayName: string, pinHash: string): Promise<Member> {
  const data = await read();
  const member: Member = {
    id: randomUUID(),
    displayName: displayName.trim(),
    pinHash,
    role: data.members.length === 0 ? "admin" : "member", // 첫 가입자가 관리자
    color: COLORS[data.members.length % COLORS.length],
    sessionVersion: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  data.members.push(member);
  await write(data);
  return member;
}

export async function touchLogin(memberId: string) {
  const data = await read();
  const member = data.members.find((m) => m.id === memberId);
  if (!member) return;
  member.lastLoginAt = new Date().toISOString();
  await write(data);
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
}

/** 업로드된 이미지의 절대 경로. Agent SDK 가 파일을 직접 읽는 데 쓴다. */
export function scheduleImagePath(schedule: Schedule): string | null {
  return schedule.imageFile ? path.join(UPLOAD_DIR, schedule.imageFile) : null;
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
  const data = await read();
  for (const s of data.schedules) {
    if (s.memberId === memberId) s.isActive = false;
  }
  await write(data);
}

/** 검토를 마친 블록을 저장하고 상태를 parsed 로 올린다. */
export async function saveScheduleBlocks(
  memberId: string,
  blocks: Omit<ScheduleBlock, "id">[],
): Promise<Schedule | null> {
  const data = await read();
  const schedule = data.schedules.find((s) => s.memberId === memberId && s.isActive);
  if (!schedule) return null;

  schedule.blocks = blocks.map((b) => ({ ...b, id: randomUUID() }));
  schedule.status = "parsed";
  await write(data);
  return schedule;
}

// ── 연습 일정 ─────────────────────────────────────────────

export async function createEvent(input: {
  createdBy: string;
  title: string;
  dates: string[];
  durationMin: number;
}): Promise<MeetEvent> {
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

/** 한 멤버의 답을 통째로 갈아끼운다. */
export async function saveResponses(
  eventId: string,
  memberId: string,
  answers: { slotKey: string; answer: "yes" | "no" }[],
): Promise<void> {
  const data = await read();
  data.responses = data.responses.filter(
    (r) => !(r.eventId === eventId && r.memberId === memberId),
  );
  data.responses.push(...answers.map((a) => ({ eventId, memberId, ...a })));
  await write(data);
}

export async function confirmEvent(
  eventId: string,
  date: string,
  startMin: number,
  place: string | null,
): Promise<MeetEvent | null> {
  const data = await read();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return null;
  event.status = "confirmed";
  event.confirmedDate = date;
  event.confirmedStartMin = startMin;
  event.place = place?.trim() || null;
  await write(data);
  return event;
}

export async function cancelEvent(eventId: string): Promise<void> {
  const data = await read();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return;
  event.status = "cancelled";
  await write(data);
}
