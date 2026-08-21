import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { AppShell } from "@/components/app-shell";
import { EventCreateForm } from "@/components/event-create-form";

export default async function NewEventPage() {
  await requireMember();

  return (
    <AppShell title="연습 일정 만들기" subtitle="가능한 날짜를 고르면 되는 시간을 찾아드려요">
      <EventCreateForm />
      <Link
        href="/"
        className="block py-3 text-center text-[15px] font-semibold text-muted hover:text-fg-2"
      >
        취소
      </Link>
    </AppShell>
  );
}
