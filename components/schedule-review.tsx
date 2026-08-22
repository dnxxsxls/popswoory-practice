"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeMyTimetable, saveMyTimetableBlocks } from "@/actions/timetable";
import { EditableScheduleGrid, type EditBlock } from "./editable-schedule-grid";
import { ScheduleGrid } from "./schedule-grid";
import { OriginalImage } from "./original-image";
import { AnalyzingCard } from "./analyzing-card";
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
  doneHref,
  onPhaseChange,
  showStepLabel = true,
}: {
  initial: ScheduleBlock[];
  hasImage: boolean;
  /** 지금 어느 단계인지 밖에 알린다 — 온보딩 진행바와 제목이 이 값을 따라간다 */
  onPhaseChange?: (phase: "analyze" | Step) => void;
  /** 온보딩은 셸이 단계를 표시하므로 자체 라벨을 끈다 */
  showStepLabel?: boolean;
  /**
   * 확정 후 곧바로 이동할 경로. 온보딩처럼 다음 단계가 정해져 있을 때 넘긴다.
   * 없으면 완료 안내를 띄우고 사용자가 고르게 한다.
   */
  doneHref?: string;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<EditBlock[]>(() => toEdit(initial));
  const [analyzing, setAnalyzing] = useState(initial.length === 0 && hasImage);
  const [step, setStep] = useState<Step>("confirm");
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  // 분석 중에는 화면 전체가 대기 카드라 step 이 의미 없다 — 그때는 analyze 로 알린다.
  useEffect(() => {
    onPhaseChange?.(analyzing ? "analyze" : step);
  }, [analyzing, step, onPhaseChange]);
  const [saved, setSaved] = useState(false);

  // 저장된 블록이 없고 이미지가 있으면 들어오자마자 분석
  useEffect(() => {
    if (!analyzing) return;
    let cancelled = false;

    (async () => {
      const res = await analyzeMyTimetable();
      if (cancelled) return;
      if (res.ok) {
        setBlocks(toEdit(res.blocks));
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
      if (doneHref) {
        // 다음 단계가 정해져 있으면 무엇을 할지 묻지 않고 그대로 이어간다
        router.replace(doneHref);
        router.refresh();
        return;
      }
      // 바로 이동하지 않고, 다음에 뭘 하면 되는지 알려준다
      setSaved(true);
      router.refresh();
    });
  }

  if (saved) {
    return (
      <>
        <div className="fixed inset-0 z-30 bg-black/40" />
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[28px] bg-surface p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line" />

          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent-fg"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </div>

          <h2 className="mt-5 text-center text-[22px] font-extrabold">시간표 등록 완료!</h2>
          <p className="mt-2 text-center text-[15px] leading-relaxed text-muted">
            이제 팀원들과 겹치는 공강 시간을
            <br />
            확인할 수 있어요.
          </p>

          <button
            type="button"
            onClick={() => {
              router.replace("/free");
              router.refresh();
            }}
            className="mt-6 h-14 w-full rounded-2xl bg-accent text-[17px] font-bold text-accent-fg"
          >
            공강표 보러가기
          </button>

          <button
            type="button"
            onClick={() => {
              router.replace("/timetable");
              router.refresh();
            }}
            className="mt-2 h-12 w-full text-[15px] font-semibold text-muted"
          >
            내 시간표 보기
          </button>
        </div>
      </>
    );
  }

  if (analyzing) {
    return <AnalyzingCard />;
  }

  const classCount = blocks.filter((b) => b.kind === "class").length;
  const personalCount = blocks.filter((b) => b.kind === "personal").length;

  return (
    <div className="space-y-4">
      {showStepLabel ? (
        <p className="px-1 text-[13px] font-bold text-accent">{STEP_LABEL[step]}</p>
      ) : null}

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
          {/* 원본을 위에 둬야 눈이 위아래로 오가며 비교하기 쉽다 */}
          {hasImage ? <OriginalImage /> : null}

          <EditableScheduleGrid
            blocks={blocks}
            onChange={setBlocks}
            addKind="class"
            editableKind="class"
          />

          <Button full onClick={() => setStep("personal")}>
            {classCount > 0 ? "수업 시간이 맞아요" : "수업 없이 진행"}
          </Button>
        </>
      ) : null}

      {step === "personal" ? (
        <>
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
          {/* 마지막은 확인만 한다 — 고치려면 이전으로 돌아가게 해서 실수로
              바꾸는 일을 막는다 */}
          <ScheduleGrid blocks={blocks} />

          <div className="flex items-center gap-4 px-1 text-[13px] font-medium text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-accent" /> 수업
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[#8b95a1]" /> 개인일정
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
