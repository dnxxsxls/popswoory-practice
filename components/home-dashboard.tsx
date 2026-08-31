import Link from "next/link";
import { formatDate } from "@/lib/candidates";
import { formatMin } from "@/lib/time";
/** 내 시간표 준비 상태 — 홈에서 할 일을 정하는 데 쓴다. */
export type TimetableState = "none" | "uploaded" | "manual" | "parsed";
import { Badge, Card } from "./ui";

/** 확정된 연습 하나. 참석 집계까지 끝난 상태로 받는다. */
export type UpcomingItem = {
  id: string;
  groupNo: number;
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  startMin: number;
  durationMin: number;
  place: string | null;
  goingNames: string[];
  declined: number;
  noReply: number;
  memberCount: number;
};

/** 아직 시간을 고르는 중인 연습. */
export type PollingItem = {
  id: string;
  groupNo: number;
  title: string;
  dateCount: number;
  /** 내가 답을 냈는지 */
  answered: boolean;
  respondedCount: number;
  memberCount: number;
  allResponded: boolean;
  canConfirm: boolean;
};

type Props = {
  timetable: TimetableState;
  upcoming: UpcomingItem[];
  polling: PollingItem[];
  /** 시간표를 아직 등록하지 않은 멤버 수 */
  missingCount: number;
};

export function homeSubtitle(upcoming: UpcomingItem[], polling: PollingItem[]): string {
  if (upcoming.length > 0) return `다가오는 연습 ${upcoming.length}개`;
  if (polling.some((event) => event.allResponded && event.canConfirm)) {
    return "최종 시간을 정할 연습이 있어요";
  }
  if (polling.length > 0) return "시간 고르는 중인 연습이 있어요";
  return "잡혀 있는 연습이 없어요";
}

export function HomeDashboard({
  timetable,
  upcoming,
  polling,
  missingCount,
}: Props) {
  return (
    <>
      {/* 내 시간표가 아직 준비되지 않았을 때만 띄운다. 다 끝난 상태를 카드 하나로
          알려줄 이유가 없고, 대시보드에는 할 일이 있는 것만 남기는 게 맞다. */}
      {timetable === "none" ? (
        <Card className="ring-2 ring-accent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-bold">시간표를 아직 등록하지 않았어요</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                등록해두면 공강 계산에 자동으로 반영돼요.
              </p>
            </div>
            <Badge tone="warn">미등록</Badge>
          </div>
          <Link href="/timetable" className="mt-4 inline-block text-[15px] font-bold text-accent">
            지금 등록하기 →
          </Link>
        </Card>
      ) : timetable === "uploaded" || timetable === "manual" ? (
        <Card className="ring-2 ring-accent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-bold">
                {timetable === "manual"
                  ? "시간표 직접 입력을 마치지 않았어요"
                  : "시간표 이미지만 올린 상태예요"}
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                수업 시간을 확인해야 공강 계산에 쓸 수 있어요.
              </p>
            </div>
            <Badge tone="warn">확인 필요</Badge>
          </div>
          <Link
            href="/timetable/review"
            className="mt-4 inline-block text-[15px] font-bold text-accent"
          >
            {timetable === "manual" ? "직접 입력 계속하기 →" : "수업 시간 확인하기 →"}
          </Link>
        </Card>
      ) : null}

      {/* ── 다가오는 연습: 언제 · 어디서 · 누가 ── */}
      {upcoming.map((e) => (
        <Link key={e.id} href={`/events/${e.id}`} className="block">
          <Card className="ring-2 ring-accent">
            <Badge tone="accent">{e.groupNo}조 · 다가오는 연습</Badge>
            <p className="mt-2.5 truncate text-[19px] font-extrabold">{e.title}</p>

            <p className="mt-1.5 text-[17px] font-bold text-accent">
              {formatDate(e.date)} {formatMin(e.startMin)}
              <span className="text-muted">
                {" – "}
                {formatMin(e.startMin + e.durationMin)}
              </span>
            </p>
            <p className="mt-1 text-[15px] text-muted">{e.place || "장소 미정"}</p>

            <div className="mt-4 border-t border-line/70 pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-bold">오는 사람</p>
                <p className="text-[15px] font-semibold text-muted">
                  <span className="text-accent">{e.goingNames.length}</span> / {e.memberCount}명
                </p>
              </div>

              {e.goingNames.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {e.goingNames.map((name) => (
                    <span
                      key={name}
                      className="max-w-[9rem] truncate rounded-lg bg-accent-soft px-2.5 py-1 text-[13px] font-bold text-accent"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2.5 text-[15px] text-muted">아직 온다고 한 사람이 없어요.</p>
              )}

              {e.declined > 0 || e.noReply > 0 ? (
                <p className="mt-3 text-[13px] text-muted">
                  {e.declined > 0 ? `못 옴 ${e.declined}명` : null}
                  {e.declined > 0 && e.noReply > 0 ? " · " : null}
                  {e.noReply > 0 ? `미응답 ${e.noReply}명` : null}
                </p>
              ) : null}
            </div>
          </Card>
        </Link>
      ))}

      {/* ── 아직 시간 고르는 중 ── */}
      {polling.map((e) => {
        const confirmationRequired = e.allResponded && e.canConfirm;
        return (
          <Link key={e.id} href={`/events/${e.id}`} className="block">
            <Card className={!e.answered || confirmationRequired ? "ring-2 ring-accent" : ""}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Badge tone={e.allResponded ? "accent" : "muted"}>
                    {e.groupNo}조{e.allResponded ? " · 응답 완료" : ""}
                  </Badge>
                  <p className="mt-2 truncate text-[17px] font-bold">{e.title}</p>
                  <p className="mt-1 text-[15px] text-muted">
                    {e.allResponded
                      ? e.canConfirm
                        ? "최종 시간을 골라주세요"
                        : "일정 생성자의 확정을 기다리는 중"
                      : `후보 ${e.dateCount}일 · ${e.respondedCount}/${e.memberCount}명 답함`}
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-bold text-accent">
                  {confirmationRequired
                    ? "시간 확정하기 →"
                    : e.allResponded
                      ? "확정 대기"
                      : e.answered
                        ? "답 바꾸기 →"
                        : "답하기 →"}
                </span>
              </div>
            </Card>
          </Link>
        );
      })}

      {upcoming.length === 0 && polling.length === 0 ? (
        <Card>
          <p className="text-[17px] font-bold">아직 잡힌 연습이 없어요</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
            날짜를 고르면 전원 공강에서 후보 시간을 뽑아줘요.
          </p>
        </Card>
      ) : null}

      <Link
        href="/events/new"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
      >
        + 연습 일정 만들기
      </Link>

      {missingCount > 0 ? (
        <Link href="/members" className="block px-1 pt-1 text-[13px] leading-relaxed text-muted">
          시간표를 아직 등록하지 않은 멤버가 {missingCount}명이에요. 이 멤버들은 공강 계산에서
          빠집니다. <span className="font-bold text-accent">멤버 보기 →</span>
        </Link>
      ) : null}
    </>
  );
}
