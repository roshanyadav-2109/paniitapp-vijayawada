/**
 * Shared state for the two app prompts: "install this app" and, once it is
 * installed, "turn notifications on".
 *
 * Both the slide-up sheet and the banner on the home screen need to agree on
 * whether there is anything left to ask for, and the banner needs to be able
 * to open the sheet from another part of the tree. A window event is enough
 * for that and costs less than threading a context through the whole shell.
 */

export type AppPromptKind = "install" | "notifications";

export const APP_PROMPT_EVENT = "paniit:app-prompt";

/** Ask the slide-up to open. No-op on the server. */
export function openAppPrompt(kind: AppPromptKind): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_PROMPT_EVENT, { detail: kind }));
}

/** True once the app is running from the home screen rather than a tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates the display-mode media query.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS has no beforeinstallprompt: Safari installs only through the Share
 * sheet, so there the prompt shows instructions instead of a button.
 */
export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac, but a Mac has no touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit;
}

const SNOOZE_KEY = "paniit:app-prompt-snooze";

type SnoozeMap = Partial<Record<AppPromptKind, number>>;

/**
 * One store per account, because a phone is not one person.
 *
 * A dismissal used to be remembered for the device: whoever signed in next
 * inherited somebody else's "Not now" and was never asked.
 */
function keyFor(scope?: string | null): string {
  return scope ? `${SNOOZE_KEY}:${scope}` : SNOOZE_KEY;
}

function readSnooze(scope?: string | null): SnoozeMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(keyFor(scope)) ?? "{}") as SnoozeMap;
  } catch {
    // Private windows and blocked site data both throw here; a prompt that
    // reappears is better than one that crashes the page.
    return {};
  }
}

/** Dismissed recently enough that we should not ask again yet. */
export function isSnoozed(kind: AppPromptKind, scope?: string | null): boolean {
  const until = readSnooze(scope)[kind];
  return typeof until === "number" && Date.now() < until;
}

export function snooze(
  kind: AppPromptKind,
  days: number,
  scope?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    const map = readSnooze(scope);
    map[kind] = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(keyFor(scope), JSON.stringify(map));
  } catch {
    /* see readSnooze */
  }
}

/** The shape Chrome fires at us; it is not in lib.dom yet. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
