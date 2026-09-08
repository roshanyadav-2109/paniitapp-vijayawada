// Short "ding" played when a new inbound message arrives. Uses Web Audio
// so no asset has to ship with the bundle. Browsers block audio until
// the user has interacted with the page; that's fine — first message
// will silently no-op if the gesture hasn't happened yet, subsequent
// ones will ring after any click/tap.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function playMessagePing(): void {
  const c = getCtx();
  if (!c) return;
  const audio: AudioContext = c;
  try {
    // Some browsers leave the context "suspended" until a user gesture
    // resumes it. Try to resume; if it fails silently, the play call
    // below will just no-op.
    if (audio.state === "suspended") {
      void audio.resume().catch(() => {});
    }
    const now = audio.currentTime;

    function tone(freq: number, start: number, dur: number, vol: number) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    }

    // Two-tone ascending chime — clearly distinct from system / app sounds
    // without being intrusive.
    tone(880, 0, 0.18, 0.16); // A5
    tone(1320, 0.1, 0.26, 0.14); // E6
  } catch {
    /* ignore audio failures */
  }
}
