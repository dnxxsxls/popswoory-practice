"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText } from "./ui";
import { EverytimeGuide } from "./everytime-guide";

type Rect = { x: number; y: number; w: number; h: number }; // 0~1 정규화
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const MIN = 0.12; // 크롭 박스 최소 크기 (비율)
const MAX_EDGE = 1400; // 저장 시 장변 상한 (px). 격자 인식엔 충분하고 분석이 빨라진다

/** 처음엔 이미지 전체를 잡는다. 잘라낼 부분은 사용자가 직접 정한다. */
const INITIAL: Rect = { x: 0, y: 0, w: 1, h: 1 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function TimetableUploader({ mode }: { mode: "onboarding" | "replace" }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; rect: Rect } | null>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
          className="flex w-full flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-14 text-center"
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0L8 8m4-4 4 4" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span className="text-[17px] font-bold">시간표 캡처 올리기</span>
          <span className="text-[15px] text-muted">
            에브리타임 시간표를 캡처해서 선택해 주세요
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

        <p className="rounded-2xl bg-surface px-5 py-4 text-[13px] leading-relaxed text-muted">
          다음 화면에서 <span className="font-medium text-fg">이름·학교가 보이는 부분을 잘라낼 수
          있어요.</span> 시간표 격자만 남기면 충분합니다.
        </p>
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

  const handles: { key: Handle; className: string }[] = [
    { key: "nw", className: "-left-2 -top-2 cursor-nwse-resize" },
    { key: "ne", className: "-right-2 -top-2 cursor-nesw-resize" },
    { key: "sw", className: "-bottom-2 -left-2 cursor-nesw-resize" },
    { key: "se", className: "-bottom-2 -right-2 cursor-nwse-resize" },
  ];

  return (
    <div className="space-y-4">
      <p className="px-1 text-[15px] text-muted">
        남길 영역을 조절해 주세요. 모서리를 끌면 크기가 바뀌어요.
      </p>

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
          className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          style={style}
          onPointerDown={(e) => startDrag("move", e)}
        >
          {handles.map((h) => (
            <span
              key={h.key}
              onPointerDown={(e) => startDrag(h.key, e)}
              className={`absolute h-6 w-6 rounded-full border-2 border-white bg-accent ${h.className}`}
            />
          ))}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={busy}
          onClick={() => {
            setSrc(null);
            setError("");
          }}
        >
          다시 고르기
        </Button>
        <Button type="button" className="flex-[2]" disabled={busy} onClick={upload}>
          {busy ? "저장 중…" : mode === "onboarding" ? "이걸로 등록" : "새 시간표로 교체"}
        </Button>
      </div>
    </div>
  );
}
