"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeMyTimetable, saveMyTimetableBlocks } from "@/actions/timetable";
import { EditableScheduleGrid, type EditBlock } from "./editable-schedule-grid";
import { OriginalImage } from "./original-image";
import type { ScheduleBlock } from "@/lib/store";
import { Button, Card, ErrorText } from "./ui";

type Step = "confirm" | "personal" | "final";

const STEP_LABEL: Record<Step, string> = {
  confirm: "1 / 3 · 수업 시간 확인",
  personal: "2 / 3 · 그 밖에 안 되는 시간",
  final: "3 / 3 · 최종 확인",
};

let seq = 0;
const nextKey = () => `blk-${seq++}`;

function toEdit(blocks: Pick<ScheduleBlock, "weekday" | "startMin" | "endMin" | "title" | "confidence" | "kind">[]): EditBlock[] {
  return blocks.map((b) => ({ ...b, key: nextKey() }));
}

export function ScheduleReview({
  initial,
  hasImage,
}: {
  initial: ScheduleBlock[];
  hasImage: boolean;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<EditBlock[]>(() => toEdit(initial));
  const [analyzing, setAnalyzing] = useState(initial.length === 0 && hasImage);
  const [step, setStep] = useState<Step>("confirm");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  // 저장된 블록이 없고 이미지가 있으면 들어오자마자 분석
  useEffect(() => {
    if (!analyzing) return;
    let cancelled = false;

    (async () => {
      const res = await analyzeMyTimetable();
      if (cancelled) return;
      if (res.ok) {
        setBlocks(toEdit(res.blocks));
        setNote(res.note);
        setError("");
      } else {
        setError(res.message);
      }
      setAnalyzing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [analyzing]);

  function save() {
    setError("");
    startSave(async () => {
      const res = await saveMyTimetableBlocks(
        blocks.map(({ weekday, startMin, endMin, title, confidence, kind }) => ({
          weekday,
          startMin,
          endMin,
          title,
          confidence,
          kind,
        })),
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.replace("/timetable");
      router.refresh();
    });
  }

  if (analyzing) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-line border-t-accent" />
          <div>
            <p className="text-[17px] font-bold">시간표를 읽는 중…</p>
            <p className="mt-1 text-[15px] text-muted">10초쯤 걸려요.</p>
          </div>
        </div>
      </Card>
    );
  }

  const classCount = blocks.filter((b) => b.kind === "class").length;
  const personalCount = blocks.filter((b) => b.kind === "personal").length;
  const lowCount = blocks.filter((b) => b.kind === "class" && b.confidence === "low").length;

  return (
    <div className="space-y-4">
      <p className="px-1 text-[13px] font-bold text-accent">{STEP_LABEL[step]}</p>

      {error ? (
        <Card className="ring-2 ring-danger">
          <p className="text-[17px] font-bold">자동 인식에 실패했어요</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{error}</p>
          <div className="mt-4 flex gap-2">
            {hasImage ? (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setError("");
                  setAnalyzing(true);
                }}
              >
                다시 시도
              </Button>
            ) : null}
            <Button className="flex-1" onClick={() => setError("")}>
              직접 입력할게요
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "confirm" ? (
        <>
          <Card className="!p-4">
            <p className="text-[15px] leading-relaxed">
              읽어온 수업이 <span className="font-semibold">{classCount}개</span>예요. 원본과
              비교해서 <span className="font-semibold">다른 부분만</span> 눌러 고쳐주세요.
              {lowCount > 0 ? (
                <>
                  {" "}
                  <span className="text-danger">{lowCount}개</span>는 인식이 불확실해요(노란 테두리).
                </>
              ) : null}
            </p>
          </Card>

          <EditableScheduleGrid
            blocks={blocks}
            onChange={setBlocks}
            addKind="class"
            editableKind="class"
          />

          {hasImage ? <OriginalImage /> : null}

          {note ? <p className="px-1 text-[13px] text-muted">메모: {note}</p> : null}

          <Button full onClick={() => setStep("personal")}>
            {classCount > 0 ? "수업 시간이 맞아요" : "수업 없이 진행"}
          </Button>
        </>
      ) : null}

      {step === "personal" ? (
        <>
          <Card className="!p-4">
            <p className="text-[15px] leading-relaxed">
              수업 말고 <span className="font-semibold">매주 안 되는 시간</span>이 또 있나요?
              <br />
              알바·통학·고정 약속처럼 반복되는 일정을 빈 칸을 눌러 넣어주세요.
            </p>
          </Card>

          <EditableScheduleGrid
            blocks={blocks}
            onChange={setBlocks}
            addKind="personal"
            editableKind="personal"
          />

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("confirm")}>
              이전
            </Button>
            <Button className="flex-[2]" onClick={() => setStep("final")}>
              {personalCount > 0 ? `${personalCount}개 넣고 다음` : "없어요, 다음"}
            </Button>
          </div>
        </>
      ) : null}

      {step === "final" ? (
        <>
          <Card className="!p-4">
            <p className="text-[15px] leading-relaxed">
              수업 <span className="font-semibold">{classCount}개</span>, 그 밖에 안 되는 시간{" "}
              <span className="font-semibold">{personalCount}개</span>. 이대로 확정하면 일정을 잡을
              때 이 시간은 <span className="font-semibold">막힌 시간</span>으로 쓰여요.
            </p>
          </Card>

          <EditableScheduleGrid blocks={blocks} onChange={setBlocks} addKind="personal" />

          <div className="flex items-center gap-4 px-1 text-[13px] font-medium text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-accent" /> 수업
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[#8b95a1]" /> 그 밖에 안 되는 시간
            </span>
          </div>

          <ErrorText>{blocks.length === 0 ? "시간이 하나도 없어요. 그래도 확정할 수 있어요." : ""}</ErrorText>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("personal")}>
              이전
            </Button>
            <Button className="flex-[2]" disabled={saving} onClick={save}>
              {saving ? "저장 중…" : "이대로 확정"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
