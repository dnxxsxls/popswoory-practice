import { NextResponse } from "next/server";
import { optionalMember } from "@/lib/guard";
import { getActiveSchedule, readScheduleImage } from "@/lib/store";

/** 본인의 최신 시간표 이미지만 내려준다. 다른 멤버의 이미지는 접근할 수 없다. */
export async function GET() {
  const session = await optionalMember();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const schedule = await getActiveSchedule(session.memberId);
  if (!schedule) return new NextResponse("Not Found", { status: 404 });

  const bytes = await readScheduleImage(schedule);
  if (!bytes) return new NextResponse("Not Found", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
    },
  });
}
