import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { getMember, saveScheduleImage } from "@/lib/store";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (크롭·리사이즈 후 기준으로는 충분히 넉넉)

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const member = await getMember(session.memberId);
  if (!member || !member.isActive) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);

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
