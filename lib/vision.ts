import "server-only";
import fs from "node:fs/promises";
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/**
 * 시간표 이미지 → 수업 블록 추출.
 *
 * Claude Agent SDK 를 쓴다. 별도의 API 키 결제 없이, 이 머신에 로그인된
 * 클로드 계정(구독)을 그대로 사용한다. 대신 **앱이 그 로그인이 있는 머신에서
 * 돌아야 한다** — Vercel 같은 곳에서는 동작하지 않는다.
 *
 * 에이전트가 Read 툴로 이미지 파일을 직접 열어 보고 JSON 을 돌려준다.
 * 결과는 반드시 사람이 검토·수정한 뒤 저장한다.
 */

// 모델 출력은 지시를 조금씩 벗어난다(예: confidence 에 "medium").
// 한 필드 때문에 전체가 버려지지 않도록 관대하게 받고, 해석은 sanitize 에서 한다.
const BlockSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  start: z.string(),
  end: z.string(),
  title: z.string().default(""),
  confidence: z.string().default("high"),
});

const ResultSchema = z.object({
  detected: z.boolean().default(true),
  note: z.string().default(""),
  blocks: z.array(z.unknown()).default([]),
});

const SYSTEM = `당신은 한국 대학교 시간표 이미지(에브리타임 등)에서 수업 블록을 추출하는 도구입니다.

작업 순서:
1. 좌측 세로축의 시각 눈금과 상단 가로축의 요일 라벨을 읽어 좌표계를 파악합니다.
2. 그 좌표계에 대조해 각 색 블록의 위쪽 경계 = 시작 시각, 아래쪽 경계 = 종료 시각을 계산합니다.
3. 블록 안 텍스트에서 과목명을 읽습니다.

규칙:
- 블록 안의 작은 글씨(강의실, 교수명)는 과목명이 아닙니다. 가장 위의 굵은 텍스트가 과목명입니다.
- 글자가 잘려 읽기 어려워도 위치와 크기로 시간은 판단할 수 있습니다. 시간을 우선하고 title 은 빈 문자열로 두세요.
- **에브리타임 시간표는 거의 항상 30분 단위입니다.** 시각은 :00 또는 :30 으로 맞추세요.
- 종료 시각은 블록의 아래 경계이며 다음 블록의 시작과 같을 수 있습니다.
- 경계가 애매하면 추측하지 말고 confidence 를 "low" 로 표시하세요.
- 같은 시간대에 블록이 겹쳐 보이면(중복 수강) 둘 다 반환합니다.
- 시간표가 아닌 이미지면 detected 를 false 로 하고 blocks 를 비웁니다.

출력 형식 (매우 중요):
- **JSON 하나만** 출력합니다. 설명 문장, 인사말, 코드펜스를 붙이지 마세요.
- 형식:
{"detected": true, "note": "한 줄 메모", "blocks": [{"weekday": 0, "start": "09:00", "end": "10:30", "title": "자료구조", "confidence": "high"}]}
- weekday 는 0=월 … 6=일. start/end 는 24시간제 "HH:MM".
- confidence 는 정확히 "high" 또는 "low" 둘 중 하나만 씁니다. 다른 값은 쓰지 마세요.`;

export type VisionBlock = {
  weekday: number;
  startMin: number;
  endMin: number;
  title: string;
  confidence: "high" | "low";
  /** 분석으로 나온 건 언제나 수업이다. 개인 불가 시간은 사용자가 직접 추가한다. */
  kind: "class";
};

export type VisionResult =
  | { ok: true; blocks: VisionBlock[]; note: string }
  | { ok: false; reason: "not_logged_in" | "not_a_timetable" | "failed"; message: string };

/** 에브리타임 시간표는 거의 항상 30분 단위 — 가장 가까운 30분 경계로 맞춘다. */
const SNAP = 30;
function snap(min: number) {
  return Math.round(min / SNAP) * SNAP;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]);
  if (Number(m[1]) > 24 || Number(m[2]) > 59 || total > 24 * 60) return null;
  return total;
}

/** 모델이 앞뒤에 말을 붙였을 수 있으므로 가장 바깥 JSON 객체만 뽑아낸다. */
function extractJson(text: string): unknown | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * 모델 출력을 그대로 믿지 않는다 — 블록 하나씩 검증하고, 이상한 것만 버리거나 강등한다.
 * "high" 가 아닌 모든 confidence 값("medium" 등)은 low 로 본다 → 검토 화면에서 강조된다.
 */
function sanitize(raw: unknown[]): VisionBlock[] {
  const out: VisionBlock[] = [];

  for (const item of raw) {
    const parsed = BlockSchema.safeParse(item);
    if (!parsed.success) continue;
    const b = parsed.data;

    const rawStart = toMinutes(b.start);
    const rawEnd = toMinutes(b.end);
    if (rawStart === null || rawEnd === null || rawStart >= rawEnd) continue;

    const startMin = snap(rawStart);
    // 스냅 때문에 길이가 0이 되면 최소 한 칸(30분)은 남긴다
    const endMin = Math.max(snap(rawEnd), startMin + SNAP);

    // 6시간을 넘는 블록은 파싱 오류일 가능성이 높다 — 버리지 않고 low 로 강등
    const tooLong = endMin - startMin > 6 * 60;

    out.push({
      weekday: b.weekday,
      startMin,
      endMin,
      title: b.title.trim().slice(0, 30),
      confidence: tooLong || b.confidence.toLowerCase() !== "high" ? "low" : "high",
      kind: "class",
    });
  }

  return out.sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin);
}

export async function analyzeTimetableImage(imagePath: string): Promise<VisionResult> {
  let text = "";

  try {
    const jpeg = await fs.readFile(imagePath);

    // 이미지를 프롬프트에 직접 넣는다 — Read 툴을 쓰면 왕복이 한 번 더 생겨 느리다
    async function* prompt(): AsyncGenerator<SDKUserMessage> {
      yield {
        type: "user",
        parent_tool_use_id: null,
        session_id: "",
        message: {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") },
            },
            { type: "text", text: "이 시간표의 수업 블록을 추출해 JSON 으로만 답하세요." },
          ],
        },
      } as SDKUserMessage;
    }

    const response = query({
      prompt: prompt(),
      options: {
        systemPrompt: SYSTEM,
        model: "opus", // 정확도 우선 (sonnet 대비 느리지만 판독이 안정적)
        allowedTools: [], // 툴이 필요 없다
        thinking: { type: "disabled" },
        permissionMode: "bypassPermissions",
        settingSources: [], // 사용자의 CLAUDE.md / settings 를 끌어오지 않는다
        maxTurns: 1,
      },
    });

    for await (const message of response) {
      if (message.type === "result") {
        if (message.subtype !== "success") {
          return {
            ok: false,
            reason: "failed",
            message: "분석을 끝내지 못했어요. 다시 시도하거나 직접 입력해 주세요.",
          };
        }
        text = message.result;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notLoggedIn = /auth|login|credential|unauthor/i.test(msg);
    return {
      ok: false,
      reason: notLoggedIn ? "not_logged_in" : "failed",
      message: notLoggedIn
        ? "이 서버에 클로드 계정 로그인이 없어요. 터미널에서 `npm run claude:login` 을 실행해 로그인한 뒤 다시 시도해 주세요."
        : `분석에 실패했어요: ${msg}`,
    };
  }

  if (!text.trim()) {
    return { ok: false, reason: "failed", message: "빈 응답을 받았어요. 다시 시도해 주세요." };
  }

  const json = extractJson(text);
  const parsed = ResultSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "failed",
      message: "결과를 이해하지 못했어요. 다시 시도하거나 직접 입력해 주세요.",
    };
  }

  if (!parsed.data.detected) {
    return {
      ok: false,
      reason: "not_a_timetable",
      message: parsed.data.note || "시간표를 찾지 못했어요. 격자가 잘 보이게 다시 잘라서 올려주세요.",
    };
  }

  const blocks = sanitize(parsed.data.blocks);
  if (blocks.length === 0) {
    return {
      ok: false,
      reason: "not_a_timetable",
      message: parsed.data.note || "수업 블록을 찾지 못했어요. 직접 입력해 주세요.",
    };
  }

  return { ok: true, blocks, note: parsed.data.note };
}
