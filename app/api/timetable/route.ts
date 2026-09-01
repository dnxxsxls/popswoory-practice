import { NextResponse } from "next/server";
import { optionalMember } from "@/lib/guard";
import { getMember, saveScheduleImage } from "@/lib/store";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (크롭·리사이즈 후 기준으로는 충분히 넉넉)

export async function POST(request: Request) {
  const session = await optionalMember();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const member = await getMember(session.memberId);
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const expectedMemberId = form.get("memberId");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);

  // 같은 브라우저의 탭은 로그인 쿠키를 공유한다. 화면을 연 계정과 현재 쿠키가
  // 다르면 다른 회원의 시간표를 덮어쓰기 전에 요청을 중단한다.
  if (expectedMemberId !== member.id) {
    return NextResponse.json(
      { error: "다른 탭에서 로그인 계정이 바뀌었어요. 이 탭을 새로고침한 뒤 다시 올려주세요." },
      { status: 409 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지가 없어요." }, { status: 400 });
  }
  if (file.type !== "image/jpeg") {
    return NextResponse.json({ error: "이미지 형식이 올바르지 않아요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 커요. 다시 시도해 주세요." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const schedule = await saveScheduleImage(member.id, bytes, { width, height });

  return NextResponse.json({ ok: true, scheduleId: schedule.id });
}
