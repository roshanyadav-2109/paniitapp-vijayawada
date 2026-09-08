"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const PREFIX = "paniit2026:";
// Login-card PAN IIT lockup. Local public asset so the canvas can draw it
// without a CORS taint.
const QR_LOGO_URL = "/logo/paniit.png";

function drawCenterLogo(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = canvas.width;
  // The PAN IIT lockup is wider than tall, so the badge cutout is a
  // rectangle and the image is drawn at its natural aspect ratio inside.
  const ratio = image.naturalWidth / image.naturalHeight || 2.3;
  const badgeW = Math.round(size * 0.34);
  const badgeH = Math.round(badgeW / ratio + badgeW * 0.18);
  const badgeX = Math.round((size - badgeW) / 2);
  const badgeY = Math.round((size - badgeH) / 2);
  const radius = Math.round(Math.min(badgeW, badgeH) * 0.18);
  const padX = Math.round(badgeW * 0.1);
  const padY = Math.round(badgeH * 0.18);
  const innerW = badgeW - padX * 2;
  const innerH = badgeH - padY * 2;
  let drawW = innerW;
  let drawH = innerW / ratio;
  if (drawH > innerH) {
    drawH = innerH;
    drawW = innerH * ratio;
  }
  const dx = badgeX + (badgeW - drawW) / 2;
  const dy = badgeY + (badgeH - drawH) / 2;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius);
  ctx.fill();
  ctx.drawImage(image, dx, dy, drawW, drawH);
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
        const logo = new Image();
        logo.onload = () => drawCenterLogo(canvas, logo);
        logo.src = QR_LOGO_URL;
      }
    );
  }, [token]);

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <canvas ref={ref} className="block" aria-label="Your badge QR" />
      </div>
      {err ? <p className="mt-3 text-xs text-iit-500">{err}</p> : null}
    </div>
  );
}
