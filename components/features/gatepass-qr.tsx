"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

// Distinct payload prefix so the gate scanner can disambiguate a "venue
// entry pass" from the social/networking connect QR (`paniit2026:`).
const PASS_PREFIX = "paniit2026-pass:";

export function GatePassQr({ token, size = 220 }: { token: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(
      ref.current,
      `${PASS_PREFIX}${token}`,
      {
        errorCorrectionLevel: "H",
        margin: 2,
        width: size,
        color: { dark: "#0d0930", light: "#ffffff" },
      },
      (e) => {
        setErr(e ? e.message : null);
      }
    );
  }, [token, size]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={ref} className="block rounded-md" aria-label="Entry gate pass QR" />
      {err ? <p className="mt-2 text-xs text-iit-500">{err}</p> : null}
    </div>
  );
}
