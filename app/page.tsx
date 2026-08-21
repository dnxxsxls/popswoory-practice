import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { getActiveSchedule, listActiveSchedules, listEvents, listMembers } from "@/lib/store";
import { formatDate } from "@/lib/candidates";
import { formatMin } from "@/components/schedule-grid";
import { AppShell } from "@/components/app-shell";
import { Badge, Card } from "@/components/ui";

export default async function HomePage() {
  const me = await requireMember();
  const [mine, members, schedules, events] = await Promise.all([
    getActiveSchedule(me.memberId),
    listMembers(),
    listActiveSchedules(),
    listEvents(),
  ]);

  const upcoming = events.filter((e) => e.status === "confirmed");
  const polling = events.filter((e) => e.status === "polling");

  const registered = new Set(schedules.filter((s) => s.blocks.length > 0).map((s) => s.memberId));
  const missing = members.filter((m) => !registered.has(m.id));

  return (
    <AppShell title={`안녕하세요, ${me.displayName} 님`} subtitle="우리 모임">
      {mine && mine.blocks.length > 0 ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-bold">시간표 등록 완료</p>
              <p className="mt-1.5 text-[15px] text-muted">
                수업 {mine.blocks.length}개 · 일정을 잡을 때 자동으로 반영돼요.
              </p>
            </div>
            <Badge tone="accent">완료</Badge>
          </div>
          <Link
            href="/timetable"
            className="mt-4 inline-block text-[15px] font-bold text-accent"
          >
            내 시간표 보기 →
          </Link>
        </Card>
      ) : mine ? (
        <Card className="ring-2 ring-accent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-bold">시간표 이미지만 올린 상태예요</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                수업 시간을 읽어야 공강 계산에 쓸 수 있어요. 한 번만 확인하면 됩니다.
              </p>
            </div>
            <Badge tone="warn">확인 필요</Badge>
          </div>
          <Link
            href="/timetable/review"
            className="mt-4 inline-block text-[15px] font-bold text-accent"
          >
            수업 시간 확인하기 →
          </Link>
        </Card>
      ) : (
        <Card className="ring-2 ring-accent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-bold">시간표를 아직 등록하지 않았어요</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                한 번만 올려두면 다시 올릴 일이 없어요.
              </p>
            </div>
            <Badge tone="warn">미등록</Badge>
          </div>
          <Link
            href="/timetable"
            className="mt-4 inline-block text-[15px] font-bold text-accent"
          >
            지금 등록하기 →
          </Link>
        </Card>
      )}

      <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-[17px] font-bold">모임 현황</p>
          <p className="text-[15px] font-semibold text-muted">
            <span className="text-accent">{registered.size}</span> / {members.length}명
          </p>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${members.length ? (registered.size / members.length) * 100 : 0}%`,
            }}
          />
        </div>

        {missing.length > 0 ? (
          <p className="mt-3 text-[15px] text-muted">
            아직 안 올린 사람: {missing.map((m) => m.displayName).join(", ")}
          </p>
        ) : (
          <p className="mt-3 text-[15px] text-muted">전원 등록됐어요.</p>
        )}

        <Link href="/members" className="mt-4 inline-block text-[15px] font-bold text-accent">
          멤버 보기 →
        </Link>
      </Card>

      {upcoming.map((e) => (
        <Link key={e.id} href={`/events/${e.id}`} className="block">
          <Card className="ring-2 ring-accent">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="accent">다가오는 연습</Badge>
                <p className="mt-2.5 truncate text-[19px] font-extrabold">{e.title}</p>
                <p className="mt-1 text-[15px] font-semibold text-accent">
                  {e.confirmedDate ? formatDate(e.confirmedDate) : ""}{" "}
                  {e.confirmedStartMin !== null ? formatMin(e.confirmedStartMin) : ""}
                </p>
                {e.place ? <p className="mt-1 text-[15px] text-muted">{e.place}</p> : null}
              </div>
            </div>
          </Card>
        </Link>
      ))}

      {polling.map((e) => (
        <Link key={e.id} href={`/events/${e.id}`} className="block">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-bold">{e.title}</p>
                <p className="mt-1 text-[15px] text-muted">
                  {e.dates.length}일 후보 · 시간 고르는 중
                </p>
              </div>
              <span className="shrink-0 text-[15px] font-bold text-accent">답하기 →</span>
            </div>
          </Card>
        </Link>
      ))}

      <Link
        href="/events/new"
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
      >
        + 연습 일정 만들기
      </Link>
    </AppShell>
  );
}
