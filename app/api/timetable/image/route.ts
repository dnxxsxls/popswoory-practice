import { NextResponse } from "next/server";
import { optionalMember } from "@/lib/guard";
import { getActiveSchedule, readScheduleImage } from "@/lib/store";

/** 본인의 최신 시간표 이미지만 내려준다. 다른 멤버의 이미지는 접근할 수 없다. */
export async function GET(request: Request) {
  const session = await optionalMember();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const expectedMemberId = new URL(request.url).searchParams.get("memberId");
  if (expectedMemberId !== session.memberId) {
    return new NextResponse("로그인 계정이 바뀌었어요. 새로고침해 주세요.", { status: 409 });
  }

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
