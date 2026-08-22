import { requireOnboarded } from "@/lib/guard";
import {
  getActiveSchedule,
  listActiveSchedules,
  listEvents,
  listMembers,
  listResponsesForEvents,
} from "@/lib/store";
import {
  HomeDashboard,
  homeSubtitle,
  type TimetableState,
  type PollingItem,
  type UpcomingItem,
} from "@/components/home-dashboard";
import { slotKeyOf, todayKst } from "@/lib/candidates";
import { AppShell } from "@/components/app-shell";

export default async function HomePage() {
  const me = await requireOnboarded();
  const [mine, members, schedules, events] = await Promise.all([
    getActiveSchedule(me.memberId),
    listMembers(),
    listActiveSchedules(),
    listEvents(),
  ]);

  const registered = new Set(schedules.filter((s) => s.blocks.length > 0).map((s) => s.memberId));

  const timetable: TimetableState =
    !mine ? "none" : mine.blocks.length > 0 ? "parsed" : "uploaded";

  const greeting = (
    <>
      안녕하세요!
      <br />
      {me.displayName} 님
    </>
  );

  const responses = await listResponsesForEvents(events.map((e) => e.id));
  const names = new Map(members.map((m) => [m.id, m.displayName]));
  const today = todayKst();

  // 확정된 연습 중 아직 지나지 않은 것만, 가까운 날짜부터.
  const upcoming: UpcomingItem[] = events
    .filter(
      (e) =>
        e.status === "confirmed" &&
        e.confirmedDate !== null &&
        e.confirmedStartMin !== null &&
        e.confirmedDate >= today,
    )
    .sort((a, b) => (a.confirmedDate ?? "").localeCompare(b.confirmedDate ?? ""))
    .map((e) => {
      // 확정된 시각에 '가능' 이라고 답한 사람을 참석자로 본다.
      const key = slotKeyOf({ date: e.confirmedDate!, startMin: e.confirmedStartMin! });
      const forSlot = responses.filter((r) => r.eventId === e.id && r.slotKey === key);
      const going = forSlot.filter((r) => r.answer === "yes");
      const declined = forSlot.filter((r) => r.answer === "no").length;
      return {
        id: e.id,
        title: e.title,
        date: e.confirmedDate!,
        startMin: e.confirmedStartMin!,
        durationMin: e.durationMin,
        place: e.place,
        goingNames: going.map((r) => names.get(r.memberId) ?? "?"),
        declined,
        noReply: Math.max(0, members.length - going.length - declined),
      };
    });

  const polling: PollingItem[] = events
    .filter((e) => e.status === "polling")
    .map((e) => ({
      id: e.id,
      title: e.title,
      dateCount: e.dates.length,
      answered: responses.some((r) => r.eventId === e.id && r.memberId === me.memberId),
      respondedCount: new Set(
        responses.filter((r) => r.eventId === e.id).map((r) => r.memberId),
      ).size,
    }));

  return (
    <AppShell title={greeting} subtitle={homeSubtitle(upcoming, polling)}>
      <HomeDashboard
        timetable={timetable}
        memberCount={members.length}
        upcoming={upcoming}
        polling={polling}
        missingCount={members.length - registered.size}
      />
    </AppShell>
  );
}
