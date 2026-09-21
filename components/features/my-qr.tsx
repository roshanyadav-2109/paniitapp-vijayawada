"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const PREFIX = "paniit2026:";
// Both bodies behind the summit, drawn into the middle of the code. Local
// assets so the canvas can read them back without a CORS taint, and both
// already cut out — the only background either had was the plate this used
// to draw behind them.
const QR_LOGOS = ["/logo/paniit-mark.png", "/logo/ap-government.webp"];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

/**
 * Draws the marks across the middle of a finished code.
 *
 * No plate behind them: the area is cleared to the code's own white, so the
 * marks sit on the same background as the rest of it and read as part of the
 * card rather than a sticker on top of one. That clearing is what makes it
 * safe — modules left under a transparent logo are what confuse a scanner,
 * and error correction H can rebuild roughly a third of the code, far more
 * than this takes out.
 */
function drawCenterLogos(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || images.length === 0) return;

  const size = canvas.width;
  const targetH = Math.round(size * 0.1);
  const gap = Math.round(size * 0.022);

  const drawn = images.map((img) => {
    const ratio = img.naturalWidth / img.naturalHeight || 1;
    return { img, w: Math.round(targetH * ratio), h: targetH };
  });

  const totalW =
    drawn.reduce((sum, d) => sum + d.w, 0) + gap * (drawn.length - 1);
  const padX = Math.round(size * 0.025);
  const padY = Math.round(size * 0.022);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    Math.round((size - totalW) / 2) - padX,
    Math.round((size - targetH) / 2) - padY,
    totalW + padX * 2,
    targetH + padY * 2
  );

  let x = Math.round((size - totalW) / 2);
  const y = Math.round((size - targetH) / 2);
  for (const d of drawn) {
    ctx.drawImage(d.img, x, y, d.w, d.h);
    x += d.w + gap;
  }
  ctx.restore();
}

export function MyQr({ token }: { token: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(
      ref.current,
      `${PREFIX}${token}`,
      {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
        color: { dark: "#000000", light: "#ffffff" },
      },
      (e) => {
        if (e) {
          setErr(e.message);
          return;
        }

        setErr(null);
        const canvas = ref.current;
        if (!canvas) return;
        // Both or neither: a half-drawn pair looks like a mistake, and the
        // code scans perfectly well with nothing in the middle.
        Promise.all(QR_LOGOS.map(loadImage))
          .then((imgs) => drawCenterLogos(canvas, imgs))
          .catch(() => {
            /* a code without the marks still works */
          });
      }
    );
  }, [token]);

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-lg border border-rule bg-white p-3 shadow-sm">
        {/* Drawn at 320px for sharpness, displayed at whatever the dialog
            has room for. Left at its natural size it was wider than the
            dialog on a phone, which pushed the panel out and took the text
            beside it off the edge of the screen. */}
        <canvas
          ref={ref}
          className="block h-auto w-full max-w-[272px]"
          aria-label="Your badge QR"
        />
      </div>
      {err ? <p className="mt-3 text-xs text-iit-500">{err}</p> : null}
    </div>
  );
}
