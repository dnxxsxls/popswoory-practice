"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeMyTimetable, saveMyTimetableBlocks } from "@/actions/timetable";
import { EditableScheduleGrid, type EditBlock } from "./editable-schedule-grid";
import { ScheduleGrid } from "./schedule-grid";
import { OriginalImage } from "./original-image";
import { AnalyzingCard } from "./analyzing-card";
import type { ScheduleBlock } from "@/lib/store";
import { Sheet } from "./sheet";
import { Button, ErrorText } from "./ui";

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
  onBackFromFirst,
  showStepLabel = true,
}: {
  initial: ScheduleBlock[];
  hasImage: boolean;
  /** 지금 어느 단계인지 밖에 알린다 — 온보딩 진행바와 제목이 이 값을 따라간다 */
  onPhaseChange?: (phase: "analyze" | "failed" | Step, detail?: string) => void;
  /** 첫 단계에서 더 뒤로 갈 곳이 있으면 넘긴다 — 이전 버튼이 생긴다 */
  onBackFromFirst?: () => void;
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

  /**
   * 분석 중에는 화면 전체가 대기 카드라 step 이 의미 없고, 인식에 실패하면
   * 제목부터 달라져야 해서 별도로 알린다. 화면 안에서 오류 카드를 또 띄우지 않는다.
   */
  useEffect(() => {
    onPhaseChange?.(
      analyzing ? "analyze" : error && hasImage ? "failed" : step,
      error || undefined,
    );
  }, [analyzing, error, hasImage, step, onPhaseChange]);
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
      // 안에 있는 두 버튼으로만 빠져나가는 창이다 — 끌어내려 닫으면 갈 곳이 없다
      <Sheet open onClose={() => {}} dismissible={false}>
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
      </Sheet>
    );
  }

  if (analyzing) {
    return <AnalyzingCard />;
  }

  // 원본이 있어야 실패 화면에서 보여줄 것이 있다. 없으면 그냥 격자로 간다.
  const failed = Boolean(error) && hasImage;

  const classCount = blocks.filter((b) => b.kind === "class").length;
  const personalCount = blocks.filter((b) => b.kind === "personal").length;

  return (
    <div className="space-y-4">
      {showStepLabel ? (
        <p className="px-1 text-[13px] font-bold text-accent">{STEP_LABEL[step]}</p>
      ) : null}

      {/*
        인식에 실패했으면 빈 격자를 들이밀 이유가 없다. 올린 원본을 바로 펼쳐
        보여주고, 직접 입력을 고르면 그때 격자로 넘어간다.
      */}
      {failed ? (
        <>
          <OriginalImage defaultOpen />

          <div className="flex gap-3">
            {onBackFromFirst ? (
              <Button variant="secondary" className="flex-1" onClick={onBackFromFirst}>
                이전
              </Button>
            ) : null}
            <Button
              className={onBackFromFirst ? "flex-[2]" : "w-full"}
              onClick={() => setError("")}
            >
              직접 입력할게요
            </Button>
          </div>
        </>
      ) : null}

      {!failed && step === "confirm" ? (
        <>
          {/* 원본을 위에 둬야 눈이 위아래로 오가며 비교하기 쉽다 */}
          {hasImage ? <OriginalImage /> : null}

          <EditableScheduleGrid
            blocks={blocks}
            onChange={setBlocks}
            addKind="class"
            editableKind="class"
          />

          <div className="flex gap-3">
            {onBackFromFirst ? (
              <Button variant="secondary" className="flex-1" onClick={onBackFromFirst}>
                이전
              </Button>
            ) : null}
            <Button
              className={onBackFromFirst ? "flex-[2]" : "w-full"}
              onClick={() => {
                // 직접 채워 넣고 넘어가면 인식 실패는 더 이상 알릴 것이 아니다
                setError("");
                setStep("personal");
              }}
            >
              {classCount > 0 ? "수업 시간이 맞아요" : "수업 없이 진행"}
            </Button>
          </div>
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
