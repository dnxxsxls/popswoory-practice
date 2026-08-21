import { requireMember } from "@/lib/guard";
import { getActiveSchedule } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { TimetableUploader } from "@/components/timetable-uploader";
import { TimetableView } from "@/components/timetable-view";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

export default async function TimetablePage() {
  const me = await requireMember();
  const schedule = await getActiveSchedule(me.memberId);

  return (
    <AppShell title="내 시간표" subtitle="한 번 등록하면 계속 유지됩니다">
      {schedule ? (
        <TimetableView registeredAt={formatDate(schedule.createdAt)} blocks={schedule.blocks} />
      ) : (
        <TimetableUploader mode="onboarding" />
      )}
    </AppShell>
  );
}
