"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, RefreshCw, X } from "@/components/icons";
import { EVENT_TAGLINE } from "@/lib/event-config";

/**
 * "Let others know you're here": a photo in the summit frame.
 *
 * The button sits above the action tiles and opens the camera straight
 * away, full screen, with the frame round the live picture so what you see
 * is what you get. Take it, keep it or take another, move and zoom it into
 * place, and the finished picture comes back in a card to share.
 *
 * There are two frames: a wide one for a photo taken wide, and a square one
 * for a photo taken upright, which the wide window would crop to a strip.
 * The camera shows whichever fits the way the phone is held.
 *
 * Everything is measured in a frame's own pixels. Its window is the bounding
 * box of the clear area in its middle; the frame is drawn over the photo, so
 * the cloud-shaped edge is the frame's to draw and the photo only has to
 * cover the box.
 *
 * Nothing leaves the phone: the camera, the photo and the picture made from
 * it stay in the browser until the person shares or saves it. Neither asks
 * for a login.
 */
interface Frame {
  src: string;
  w: number;
  h: number;
  win: { x: number; y: number; w: number; h: number };
}

type Shape = "landscape" | "portrait";

const FRAMES: Record<Shape, Frame> = {
  landscape: {
    src: "/ui/frame/summit-frame.webp",
    w: 1536,
    h: 1024,
    win: { x: 240, y: 183, w: 1066, h: 602 },
  },
  portrait: {
    src: "/ui/frame/summit-frame-square.webp",
    w: 1254,
    h: 1254,
    win: { x: 185, y: 186, w: 915, h: 775 },
  },
};

/** Upright and square pictures go in the square frame, wide ones in the
 *  wide frame. */
function shapeOf(w: number, h: number): Shape {
  return h >= w ? "portrait" : "landscape";
}

function frameFor(p: { w: number; h: number }) {
  return FRAMES[shapeOf(p.w, p.h)];
}

/** A frame's window as percentages of the frame, for laying things out in it. */
function winStyle(f: Frame): React.CSSProperties {
  return {
    left: `${(f.win.x / f.w) * 100}%`,
    top: `${(f.win.y / f.h) * 100}%`,
    width: `${(f.win.w / f.w) * 100}%`,
    height: `${(f.win.h / f.h) * 100}%`,
  };
}

function centre(f: Frame) {
  return { x: f.win.x + f.win.w / 2, y: f.win.y + f.win.h / 2 };
}

const MAX_ZOOM = 4;
/** Saved at one and a half times the frame: the photo keeps its detail and
 *  the file still sends quickly on a phone connection. */
const OUT_SCALE = 1.5;
const FILE_NAME = "paniit-ap-summit-2026.jpg";
/** What goes with the picture wherever it is shared. */
const SHARE_TEXT = `I'm at the PanIIT Andhra Pradesh Summit 2026 — ${EVENT_TAGLINE}. Join us in building Andhra's deeptech future. andhra.paniit.space`;

/**
 * Where LinkedIn and X take a post from a web page. Neither will take a
 * picture that way, only words: the caption goes in, and the photo is saved
 * to the phone first for the person to add.
 */
const POST_TO = {
  linkedin: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(SHARE_TEXT)}`,
  x: `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}`,
} as const;

interface Photo {
  url: string;
  w: number;
  h: number;
}

/** Zoom over the fit that just covers the window, and where the photo's
 *  centre sits relative to the window's, in frame pixels. */
interface View {
  zoom: number;
  x: number;
  y: number;
}

const FIT: View = { zoom: 1, x: 0, y: 0 };

function cover(p: { w: number; h: number }) {
  const { win } = frameFor(p);
  return Math.max(win.w / p.w, win.h / p.h);
}

/** Never let the photo slide or shrink so far that the window shows a gap. */
function clampView(v: View, p: Photo): View {
  const { win } = frameFor(p);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const s = cover(p) * zoom;
  const mx = Math.max(0, (p.w * s - win.w) / 2);
  const my = Math.max(0, (p.h * s - win.h) / 2);
  return {
    zoom,
    x: Math.min(mx, Math.max(-mx, v.x)),
    y: Math.min(my, Math.max(-my, v.y)),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

async function compose(photo: Photo, view: View): Promise<File> {
  const f = frameFor(photo);
  const { x: cx, y: cy } = centre(f);
  const [frame, img] = await Promise.all([loadImage(f.src), loadImage(photo.url)]);
  const c = document.createElement("canvas");
  c.width = f.w * OUT_SCALE;
  c.height = f.h * OUT_SCALE;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#0d0930";
  ctx.fillRect(0, 0, c.width, c.height);
  const s = cover(photo) * view.zoom;
  const pw = photo.w * s;
  const ph = photo.h * s;
  ctx.drawImage(
    img,
    (cx + view.x - pw / 2) * OUT_SCALE,
    (cy + view.y - ph / 2) * OUT_SCALE,
    pw * OUT_SCALE,
    ph * OUT_SCALE
  );
  ctx.drawImage(frame, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.92)
  );
  return new File([blob], FILE_NAME, { type: "image/jpeg" });
}

function download(file: File) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------------------------------------------------------------------------

export function FrameCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Laid out as the gate pass banner is, words and a button on the
          left and the thing itself on the right, on a warm cream that takes
          its colour from the frame's golden edge: the blue belongs to the
          pass and the green to the install banner, and a third dark block
          among the navy tiles is what this replaced. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-4 overflow-hidden rounded-lg border border-[#F0DDB3] bg-[#FFF7E6] p-4 text-left transition-colors hover:bg-[#FFF2D9] sm:gap-6 sm:p-5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-balance font-display text-[17px] font-semibold leading-snug text-brand-950 sm:text-[19px]">
            Let others know you&rsquo;re here
          </span>
          <span className="mt-1 block text-[12.5px] leading-5 text-brand-950/70">
            Take a photo in the Andhra&rsquo;s Resilient Deeptech Decade frame and share it.
          </span>
          <span className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white">
            Open camera
          </span>
        </span>
        {/* The frame itself, tipped a little like a print, over the navy
            the camera opens on. */}
        <span className="relative aspect-[3/2] w-[128px] shrink-0 rotate-[3deg] overflow-hidden rounded-md bg-brand-950 shadow-[0_10px_22px_-10px_rgba(13,9,48,0.5)] ring-2 ring-white sm:w-[168px]">
          <span
            className="absolute grid place-items-center bg-gradient-to-br from-brand-700 to-brand-500"
            style={winStyle(FRAMES.landscape)}
          >
            <Camera className="size-5 text-white/85" strokeWidth={1.5} />
          </span>
          <Image src={FRAMES.landscape.src} alt="" fill sizes="170px" className="object-cover" />
        </span>
      </button>

      {open ? (
        <FrameCamera onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------

type Step = "camera" | "blocked" | "review" | "adjust" | "result";

const STEP_TITLE: Record<Exclude<Step, "result">, string> = {
  camera: "Fit yourself in the frame",
  blocked: "The camera could not be opened",
  review: "Keep this one?",
  adjust: "Drag to move, pinch to zoom",
};

function FrameCamera({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("camera");
  // The live picture's shape picks the frame round it. Until the camera
  // says, the way the screen is held is the best guess.
  const [camShape, setCamShape] = useState<Shape>(() =>
    window.innerHeight > window.innerWidth ? "portrait" : "landscape"
  );
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [live, setLive] = useState(false);
  const [streamId, setStreamId] = useState(0);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [view, setView] = useState<View>(FIT);
  const [result, setResult] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageW, setStageW] = useState(0);
  // Whether this browser can hand a picture to the share sheet. Asked after
  // mounting, as the server has no navigator to ask.
  const [canShare, setCanShare] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const shootRef = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const photoRef = useRef<Photo | null>(null);
  const resultRef = useRef<{ file: File; url: string } | null>(null);
  const mounted = useRef(true);
  photoRef.current = photo;
  resultRef.current = result;

  // A photo sits in the frame its own shape picks; the camera, in the one
  // the live picture's shape picks.
  const frame =
    photo && (step === "review" || step === "adjust") ? frameFor(photo) : FRAMES[camShape];
  const { x: cx, y: cy } = centre(frame);
  const k = stageW / frame.w;

  // The stage comes and goes with the steps, so it is measured through a
  // callback ref rather than once.
  const stageEl = useRef<HTMLDivElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const setStage = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    stageEl.current = el;
    if (el) {
      observer.current = new ResizeObserver(([e]) => setStageW(e.contentRect.width));
      observer.current.observe(el);
    }
  }, []);

  // ---- camera ----
  // Each request for the camera gets a number; a stream that arrives for
  // one that has since been replaced or cancelled is stopped, not shown, so
  // two quick requests never leave the camera running behind the page.
  const request = useRef(0);

  const stopCamera = useCallback(() => {
    request.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  const startCamera = useCallback(
    async (face: "user" | "environment") => {
      setError(null);
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) {
        // No camera from the page here (some in-app browsers): the phone's
        // own camera, through the file picker, still works.
        setStep("blocked");
        return;
      }
      setStep("camera");
      const mine = ++request.current;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: face, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!mounted.current || mine !== request.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setFacing(face);
        setStreamId((n) => n + 1);
      } catch {
        if (mounted.current && mine === request.current) setStep("blocked");
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    const v = videoRef.current;
    if (step !== "camera" || !v || !streamRef.current) return;
    v.srcObject = streamRef.current;
    v.play().catch(() => {});
  }, [step, streamId]);

  // Open on the camera; hold the page still underneath; let everything go
  // on the way out.
  useEffect(() => {
    mounted.current = true;
    void startCamera("user");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      setCanShare(
        !!navigator.canShare?.({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] })
      );
    } catch {
      setCanShare(false);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      mounted.current = false;
      stopCamera();
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snap() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // The front camera is shown mirrored, as a mirror is what people expect
    // to look into, but the picture is kept the right way round, as a
    // phone's own camera keeps it: at the summit the backdrop behind them
    // is lettered, and a shared photo should not have it backwards.
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && acceptPhoto(b, "review"), "image/jpeg", 0.95);
    stopCamera();
  }

  // ---- a photo, from the camera or the gallery ----
  function acceptPhoto(blob: Blob, next: "review" | "adjust") {
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url);
      setPhoto({ url, w: img.naturalWidth, h: img.naturalHeight });
      setView(FIT);
      setError(null);
      setStep(next);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That file could not be opened as a photo. Try a JPEG or PNG.");
    };
    img.src = url;
  }

  function onFile(next: "review" | "adjust") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      stopCamera();
      acceptPhoto(f, next);
    };
  }

  // ---- moving and zooming ----
  const zoomAt = useCallback((factor: number, fx: number, fy: number) => {
    const p = photoRef.current;
    if (!p) return;
    setView((v) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
      const r = zoom / v.zoom;
      // keep the point under the fingers where it is
      return clampView({ zoom, x: fx + (v.x - fx) * r, y: fy + (v.y - fy) * r }, p);
    });
  }, []);

  /** A point on screen, in frame pixels from the window's centre. */
  const toWindow = useCallback(
    (clientX: number, clientY: number) => {
      const r = stageEl.current?.getBoundingClientRect();
      if (!r || !k) return { x: 0, y: 0 };
      return { x: (clientX - r.left) / k - cx, y: (clientY - r.top) / k - cy };
    },
    [k, cx, cy]
  );

  // A wheel listener React would register as passive, which cannot stop the
  // page scrolling under it.
  useEffect(() => {
    const el = stageEl.current;
    if (!el || step !== "adjust") return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = toWindow(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * 0.0015), f.x, f.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step, stageW, toWindow, zoomAt]);

  function onPointerDown(e: React.PointerEvent) {
    if (step !== "adjust") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent) {
    const pts = pointers.current;
    const prev = pts.get(e.pointerId);
    if (!prev || !photo || !k) return;
    if (pts.size === 1) {
      const dx = (e.clientX - prev.x) / k;
      const dy = (e.clientY - prev.y) / k;
      setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, photo));
    } else if (pts.size === 2) {
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const mid = toWindow((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
        const dx = (e.clientX - prev.x) / 2 / k;
        const dy = (e.clientY - prev.y) / 2 / k;
        setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, photo));
        if (before > 0) zoomAt(after / before, mid.x, mid.y);
      }
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
  }

  // ---- the finished picture ----
  async function done() {
    if (!photo) return;
    setBusy(true);
    try {
      const file = await compose(photo, view);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
      setResult({ file, url: URL.createObjectURL(file) });
      setStep("result");
    } catch {
      setError("Could not make the picture. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** The caption on the clipboard as well: several apps take the picture
   *  from the share sheet and leave its words behind. */
  function copyCaption() {
    void navigator.clipboard?.writeText(SHARE_TEXT).catch(() => {});
  }

  async function share() {
    if (!result) return;
    copyCaption();
    setHint("The caption is copied too, to paste if the app leaves it out.");
    try {
      await navigator.share({ files: [result.file], text: SHARE_TEXT });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      // The sheet would not open here: saving it is the next best thing.
      download(result.file);
    }
  }

  /** Straight to a LinkedIn or X post, with the photo saved to add to it. */
  function postTo(site: keyof typeof POST_TO) {
    if (!result) return;
    // Opened before anything else, while it still counts as the tap: a
    // window opened later is a popup, and gets blocked.
    window.open(POST_TO[site], "_blank", "noopener,noreferrer");
    download(result.file);
    copyCaption();
    setHint("Your photo is saved and the caption copied. Add the photo to the post.");
  }

  function takeAnother() {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    setResult(null);
    void startCamera(facing);
  }

  // ---- layout ----
  let photoStyle: React.CSSProperties | undefined;
  if (photo && k) {
    const s = cover(photo) * view.zoom * k;
    const w = photo.w * s;
    const h = photo.h * s;
    photoStyle = {
      width: w,
      height: h,
      transform: `translate3d(${(cx + view.x) * k - w / 2}px, ${(cy + view.y) * k - h / 2}px, 0)`,
    };
  }

  const inputs = (
    <>
      <input ref={pickRef} type="file" accept="image/*" hidden onChange={onFile("adjust")} />
      <input ref={shootRef} type="file" accept="image/*" capture="user" hidden onChange={onFile("review")} />
    </>
  );

  if (step === "result" && result) {
    // Over the home screen, which stays in sight behind a blur: the picture
    // is something you made there, not a screen you were taken away to.
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your summit photo"
        onClick={onClose}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-950/30 p-4 font-sans backdrop-blur-md animate-in fade-in-0"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-lg bg-white text-brand-950 shadow-[0_24px_60px_-20px_rgba(13,9,48,0.55)] animate-in zoom-in-95"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/55"
          >
            <X className="size-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="Your photo in the summit frame" className="block w-full" />
          <div className="p-4">
            <p className="font-display text-[16px] font-medium leading-snug">You&rsquo;re in the frame</p>
            <p className="mt-1 text-[13px] leading-5 text-brand-900/65">
              Share it and let others know you&rsquo;re at {EVENT_TAGLINE}.
            </p>
            <div className="mt-4 grid gap-2">
              {canShare ? (
                <button
                  type="button"
                  onClick={share}
                  className="h-11 rounded-md bg-brand-800 text-[14px] font-medium text-white transition-colors hover:bg-brand-900"
                >
                  Share
                </button>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => postTo("linkedin")}
                  className="h-11 rounded-md border border-rule bg-white text-[14px] text-brand-900 transition-colors hover:bg-paper"
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => postTo("x")}
                  className="h-11 rounded-md border border-rule bg-white text-[14px] text-brand-900 transition-colors hover:bg-paper"
                >
                  X (Twitter)
                </button>
              </div>
              <button
                type="button"
                onClick={() => download(result.file)}
                className="h-11 rounded-md border border-rule bg-white text-[14px] text-brand-900 transition-colors hover:bg-paper"
              >
                Download
              </button>
              <button
                type="button"
                onClick={takeAnother}
                className="h-9 text-[13px] text-brand-800"
              >
                Take another
              </button>
            </div>
            {hint ? (
              <p className="mt-1 text-center text-[12px] leading-5 text-brand-900/60">{hint}</p>
            ) : null}
          </div>
        </div>
        {inputs}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Summit photo frame"
      className="safe-top safe-bottom fixed inset-0 z-[80] flex flex-col bg-[#07061a] font-sans text-white"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate pr-12 text-center text-[13px] font-medium text-white/80">
          {step === "result" ? "" : STEP_TITLE[step]}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          ref={setStage}
          className={`relative select-none overflow-hidden ${
            step === "adjust" ? "cursor-grab touch-none active:cursor-grabbing" : ""
          }`}
          style={{
            aspectRatio: `${frame.w} / ${frame.h}`,
            width: `min(100vw, calc((100dvh - 250px) * ${frame.w / frame.h}), 1100px)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="absolute bg-gradient-to-br from-brand-800 to-brand-600" style={winStyle(frame)} />

          {step === "camera" ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                onPlaying={() => setLive(true)}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth) setCamShape(shapeOf(v.videoWidth, v.videoHeight));
                }}
                onResize={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth) setCamShape(shapeOf(v.videoWidth, v.videoHeight));
                }}
                className="absolute object-cover"
                style={{ ...winStyle(frame), transform: facing === "user" ? "scaleX(-1)" : undefined }}
              />
              {!live ? (
                <div
                  className="absolute grid place-items-center text-[12px] text-white/75"
                  style={winStyle(frame)}
                >
                  Starting the camera&hellip;
                </div>
              ) : null}
            </>
          ) : null}

          {(step === "review" || step === "adjust") && photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 top-0 max-w-none"
              style={photoStyle}
            />
          ) : null}

          {step === "blocked" ? (
            <div className="absolute grid place-items-center text-white/80" style={winStyle(frame)}>
              <Camera className="size-7" strokeWidth={1.4} />
            </div>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frame.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
      </div>

      <div className="shrink-0 px-5 pb-6 pt-4">
        {error ? <p className="mb-3 text-center text-[12.5px] text-iit-300">{error}</p> : null}

        {step === "camera" ? (
          <div className="mx-auto flex max-w-sm items-center justify-between">
            <button
              type="button"
              onClick={() => pickRef.current?.click()}
              aria-label="Choose a photo from the gallery"
              className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <GalleryIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={snap}
              disabled={!live}
              aria-label="Take the photo"
              className="grid size-[76px] place-items-center rounded-full border-[5px] border-white/90 transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className="size-[58px] rounded-full bg-white" />
            </button>
            <button
              type="button"
              onClick={() => startCamera(facing === "user" ? "environment" : "user")}
              aria-label="Switch camera"
              className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <RefreshCw className="size-5" />
            </button>
          </div>
        ) : step === "review" ? (
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => startCamera(facing)}
              className="h-12 rounded-full border border-white/35 text-[15px] font-medium hover:bg-white/10"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={() => setStep("adjust")}
              className="h-12 rounded-full bg-white text-[15px] font-medium text-brand-900 hover:bg-white/90"
            >
              Keep
            </button>
          </div>
        ) : step === "adjust" ? (
          <div className="mx-auto max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-[12px] text-white/60">Zoom</span>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={view.zoom}
                onChange={(e) => zoomAt(Number(e.target.value) / view.zoom, 0, 0)}
                aria-label="Zoom"
                className="h-1.5 flex-1 accent-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => startCamera(facing)}
                className="h-12 rounded-full border border-white/35 text-[15px] font-medium hover:bg-white/10"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={done}
                disabled={busy}
                className="h-12 rounded-full bg-white text-[15px] font-medium text-brand-900 hover:bg-white/90 disabled:opacity-60"
              >
                {busy ? "Making it…" : "Done"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm text-center">
            <p className="text-[12.5px] text-white/70">
              Allow the camera for this site, or use the phone&rsquo;s own camera.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => shootRef.current?.click()}
                className="h-12 rounded-full bg-white text-[14px] font-medium text-brand-900"
              >
                Open camera
              </button>
              <button
                type="button"
                onClick={() => pickRef.current?.click()}
                className="h-12 rounded-full border border-white/35 text-[14px]"
              >
                Upload a photo
              </button>
            </div>
          </div>
        )}
      </div>
      {inputs}
    </div>,
    document.body
  );
}

/** solar:gallery-linear, drawn here as the generated set has no gallery. */
function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
      <circle cx="16" cy="8" r="2" />
      <path strokeLinecap="round" d="m2 12.5l1.752-1.533a2.3 2.3 0 0 1 3.14.105l4.29 4.29a2 2 0 0 0 2.564.222l.298-.21a3 3 0 0 1 3.731.225L21 18.5" />
    </svg>
  );
}
