"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startManualTimetable } from "@/actions/timetable";
import { Button, ErrorText } from "./ui";
import { EverytimeGuide } from "./everytime-guide";

type Rect = { x: number; y: number; w: number; h: number }; // 0~1 정규화
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const MIN = 0.12; // 크롭 박스 최소 크기 (비율)
const MAX_EDGE = 1400; // 저장 시 장변 상한 (px). 격자 인식엔 충분하고 분석이 빨라진다

/** 처음엔 이미지 전체를 잡는다. 잘라낼 부분은 사용자가 직접 정한다. */
const INITIAL: Rect = { x: 0, y: 0, w: 1, h: 1 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function TimetableUploader({
  mode,
  /** 최초 등록 화면에서는 직접 입력 경로를 숨겨 화면을 단순하게 둔다 */
  allowManual = true,
}: {
  mode: "onboarding" | "replace";
  allowManual?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; rect: Rect } | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startingManual, startManual] = useTransition();

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }
    setError("");
    setRect(INITIAL);
    setRatio(null);
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  const [dragging, setDragging] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);

  function startDrag(handle: Handle, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, rect };
    setDragging(true);
  }

  // 드래그 중에는 window 에서 좌표를 받는다.
  // (setPointerCapture 는 합성 이벤트/일부 환경에서 누락되는 경우가 있어 쓰지 않는다)
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const bounds = boxRef.current?.getBoundingClientRect();
      if (!drag || !bounds) return;

      const dx = (e.clientX - drag.startX) / bounds.width;
      const dy = (e.clientY - drag.startY) / bounds.height;
      const r = drag.rect;

      if (drag.handle === "move") {
        setRect({
          ...r,
          x: clamp(r.x + dx, 0, 1 - r.w),
          y: clamp(r.y + dy, 0, 1 - r.h),
        });
        return;
      }

      let { x, y, w, h } = r;
      const right = r.x + r.w;
      const bottom = r.y + r.h;

      if (drag.handle === "nw" || drag.handle === "sw") {
        x = clamp(r.x + dx, 0, right - MIN);
        w = right - x;
      } else {
        w = clamp(r.w + dx, MIN, 1 - r.x);
      }

      if (drag.handle === "nw" || drag.handle === "ne") {
        y = clamp(r.y + dy, 0, bottom - MIN);
        h = bottom - y;
      } else {
        h = clamp(r.h + dy, MIN, 1 - r.y);
      }

      setRect({ x, y, w, h });
    };

    const onEnd = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [dragging]);

  async function upload() {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;

    setBusy(true);
    setError("");
    try {
      const sx = Math.round(rect.x * img.naturalWidth);
      const sy = Math.round(rect.y * img.naturalHeight);
      const sw = Math.max(1, Math.round(rect.w * img.naturalWidth));
      const sh = Math.max(1, Math.round(rect.h * img.naturalHeight));

      const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
      const outW = Math.max(1, Math.round(sw * scale));
      const outH = Math.max(1, Math.round(sh * scale));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("이미지를 처리할 수 없어요.");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("이미지를 만들지 못했어요.");

      const form = new FormData();
      form.append("file", blob, "timetable.jpg");
      form.append("width", String(outW));
      form.append("height", String(outH));

      const res = await fetch("/api/timetable", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "업로드에 실패했어요.");
      }

      router.replace("/timetable/review");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
      setBusy(false);
    }
  }

  // ── 파일 선택 전 ──────────────────────────────────────
  if (!src) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="dash-border flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl px-6 text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
              aria-hidden="true"
            >
              <path d="M12 16V4m0 0L8 8m4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          </span>
          <span className="text-[17px] font-bold">시간표 캡처 올리기</span>
          <span className="text-[15px] text-muted">
            에브리타임 시간표를 캡처해서 업로드해 주세요
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        <ErrorText>{error}</ErrorText>

        <EverytimeGuide />

        {allowManual ? (
          <button
            type="button"
            disabled={startingManual}
            onClick={() =>
              startManual(async () => {
                await startManualTimetable();
                router.replace("/timetable/review");
                router.refresh();
              })
            }
            className="w-full py-2 text-[15px] font-semibold text-muted disabled:opacity-50"
          >
            {startingManual ? "여는 중…" : "에타 시간표가 없어요 · 직접 입력할게요"}
          </button>
        ) : null}
      </div>
    );
  }

  // ── 크롭 화면 ────────────────────────────────────────
  const style = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };

  // 핸들은 크롭 영역 '안쪽' 모서리에 둔다. 바깥으로 내밀면 컨테이너에 잘려 반쪽만 보인다.
  // wrap 은 44x44 터치 영역, svg 는 그 안에서 크롭 모서리에 딱 붙인다
  const handles: { key: Handle; wrap: string; svg: string; rotate: string }[] = [
    { key: "nw", wrap: "left-0 top-0 cursor-nwse-resize", svg: "left-0 top-0", rotate: "rotate-0" },
    { key: "ne", wrap: "right-0 top-0 cursor-nesw-resize", svg: "right-0 top-0", rotate: "rotate-90" },
    {
      key: "se",
      wrap: "bottom-0 right-0 cursor-nwse-resize",
      svg: "bottom-0 right-0",
      rotate: "rotate-180",
    },
    {
      key: "sw",
      wrap: "bottom-0 left-0 cursor-nesw-resize",
      svg: "bottom-0 left-0",
      rotate: "-rotate-90",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-[17px] font-bold">남길 영역을 정해주세요</p>
        <p className="mt-1 text-[15px] text-muted">모서리를 끌면 크기가 바뀌어요.</p>
      </div>

      <div
        ref={boxRef}
        className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-surface"
        style={ratio ? { width: `min(100%, calc(56svh * ${ratio}))` } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="선택한 시간표"
          draggable={false}
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) {
              setRatio(el.naturalWidth / el.naturalHeight);
            }
          }}
          className="block w-full select-none"
        />

        <div
          className="absolute cursor-move border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={style}
          onPointerDown={(e) => startDrag("move", e)}
        >
          {handles.map((h) => (
            <span
              key={h.key}
              onPointerDown={(e) => startDrag(h.key, e)}
              aria-hidden="true"
              className={`absolute h-11 w-11 ${h.wrap}`}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                className={`absolute text-accent ${h.svg} ${h.rotate}`}
              >
                <path
                  d="M25 3.5H12.5C7.53 3.5 3.5 7.53 3.5 12.5V25"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ))}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 !bg-surface"
          disabled={busy}
          onClick={() => {
            setSrc(null);
            setError("");
          }}
        >
          다시 고르기
        </Button>
        <Button type="button" className="flex-1" disabled={busy} onClick={upload}>
          {busy ? "저장 중…" : mode === "onboarding" ? "이걸로 등록" : "새 시간표로 교체"}
        </Button>
      </div>
    </div>
  );
}
