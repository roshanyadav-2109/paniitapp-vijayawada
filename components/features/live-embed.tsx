"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A YouTube live stream that shows what is happening now, with a sound
 * button people can actually find.
 *
 * An embedded live stream can open at the start of what has been recorded
 * so far rather than at the live moment. So once the player is up, and
 * again whenever it comes back into view (the carousel returning to it),
 * it is told to seek past the end, which a live player answers by jumping
 * to the live edge.
 *
 * It starts muted, because a phone will not autoplay sound. YouTube's own
 * volume control is small and hidden behind a tap on a phone, so the
 * button in the corner turns sound on and off.
 */
export function LiveEmbed({ id, title }: { id: string; title: string }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [muted, setMuted] = useState(true);

  const command = (func: string, args: unknown[] = []) =>
    ref.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube.com");

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const toLive = () => command("seekTo", [1e9, true]);
    // The player takes a moment to be ready for commands after it loads.
    const onLoad = () => {
      [1500, 4000].forEach((ms) => window.setTimeout(toLive, ms));
    };
    frame.addEventListener("load", onLoad);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) toLive();
      },
      { threshold: 0.6 }
    );
    io.observe(frame);
    return () => {
      frame.removeEventListener("load", onLoad);
      io.disconnect();
    };
  }, []);

  function toggleSound() {
    if (muted) {
      command("unMute");
      command("setVolume", [100]);
      command("playVideo");
    } else {
      command("mute");
    }
    setMuted(!muted);
  }

  return (
    <>
      <iframe
        ref={ref}
        src={`https://www.youtube.com/embed/${id}?playsinline=1&rel=0&autoplay=1&mute=1&enablejsapi=1&controls=0&disablekb=1&iv_load_policy=3&fs=0&modestbranding=1`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        // No YouTube controls and no taps through to the player: its "More
        // videos", playlists and suggestions never come up, and a swipe on
        // the carousel moves the carousel. Sound is the button below.
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
      />
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        className="absolute bottom-2.5 right-2.5 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/70 px-3 text-[12.5px] font-semibold text-white"
      >
        {muted ? <SpeakerOff /> : <SpeakerOn />}
        {muted ? "Tap for sound" : "Sound on"}
      </button>
    </>
  );
}

function SpeakerOff() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );
}

function SpeakerOn() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}
