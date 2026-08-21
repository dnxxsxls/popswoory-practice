import { requireMember } from "@/lib/guard";
import { getActiveSchedule } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { TimetableUploader } from "@/components/timetable-uploader";
import { TimetableView } from "@/components/timetable-view";
import { Card } from "@/components/ui";

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

      <Card>
        <p className="text-[17px] font-bold">다음에 붙을 기능</p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          멤버 전원의 시간표가 모이면 겹치는 공강 시간대를 자동으로 계산해 연습 후보로
          보여줍니다.
        </p>
      </Card>
    </AppShell>
  );
}
