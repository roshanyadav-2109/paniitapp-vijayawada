"use client";

import { useRef, useState } from "react";

/** Furthest the knob travels from the middle, in pixels. */
const REACH = 34;
/** Below this much push, nothing moves: a resting thumb is not a step. */
const DEAD = 0.12;

/**
 * A thumbstick for walking: push up to go forward, down to step back, to
 * either side to turn. How far it is pushed is how fast. Writes straight
 * into `value` (read by the 3D view every frame) and says only when walking
 * starts and stops, so the page does not re-render as the thumb moves.
 */
export function Joystick({
  value,
  onActive,
}: {
  value: { current: { f: number; t: number } };
  onActive: (active: boolean) => void;
}) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);

  function read(clientX: number, clientY: number) {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > REACH) {
      dx = (dx / len) * REACH;
      dy = (dy / len) * REACH;
    }
    setKnob({ x: dx, y: dy });
    // Squared, past the dead zone: fine control near the middle.
    const shape = (v: number) => {
      const a = Math.abs(v);
      if (a < DEAD) return 0;
      const k = (a - DEAD) / (1 - DEAD);
      return Math.sign(v) * k * k;
    };
    value.current = { f: shape(-dy / REACH), t: shape(dx / REACH) };
  }

  function release() {
    setHeld(false);
    setKnob({ x: 0, y: 0 });
    value.current = { f: 0, t: 0 };
    onActive(false);
  }

  return (
    <div
      ref={base}
      role="application"
      aria-label="Walk: push up to go forward, down to go back, sideways to turn"
      className="relative size-[104px] touch-none select-none rounded-full bg-slate-950/30 shadow-[0_6px_20px_rgba(15,23,42,0.25)] ring-1 ring-white/45 backdrop-blur-md"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setHeld(true);
        onActive(true);
        read(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (held) read(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* the four ways it goes, marked small at the rim */}
      <svg viewBox="0 0 104 104" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <circle cx="52" cy="52" r="34" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="1" />
        <g fill="white" fillOpacity="0.75">
          <path d="M52 9 l5 6 h-10 z" />
          <path d="M52 95 l5 -6 h-10 z" />
          <path d="M9 52 l6 -5 v10 z" />
          <path d="M95 52 l-6 -5 v10 z" />
        </g>
      </svg>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 size-11 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          transition: held ? "none" : "transform 160ms ease-out",
        }}
      >
        <span className="absolute inset-[30%] rounded-full bg-slate-300/70" />
      </div>
    </div>
  );
}
