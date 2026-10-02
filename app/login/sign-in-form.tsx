"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "@/components/icons";

/**
 * What a failed sign-in says. The codes are the server's, and one of them,
 * invalid_google_state, was being shown word for word.
 */
function explain(code: string): string {
  switch (code) {
    case "invalid_google_state":
    case "missing_google_nonce":
      return "That sign-in timed out or was started on another screen. Tap Continue with Google again.";
    case "missing_google_id_token":
      return "Google did not finish signing you in. Tap Continue with Google again.";
    case "no_email_from_provider":
      return "Google did not share an email address for that account. Try another account.";
    case "access_denied":
      return "Sign-in was cancelled.";
    default:
      return "Could not sign you in. Tap Continue with Google again.";
  }
}

/** The slice of Google's script this file uses. */
interface GoogleIdApi {
  accounts?: {
    id?: {
      initialize: (opts: {
        client_id: string;
        nonce?: string;
        use_fedcm_for_prompt?: boolean;
        itp_support?: boolean;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        callback: (res: { credential?: string }) => void;
      }) => void;
      prompt: (listener?: (n: { isSkippedMoment?: () => boolean }) => void) => void;
    };
  };
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    const ready = () => !!(window as unknown as { google?: GoogleIdApi }).google?.accounts?.id;
    if (ready()) return resolve();
    if (!document.querySelector(`script[src="${GIS_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.onerror = () => reject(new Error("gis_unavailable"));
      document.head.appendChild(s);
    }
    const started = Date.now();
    const wait = () =>
      ready() ? resolve() : Date.now() - started > 8000 ? reject(new Error("gis_timeout")) : setTimeout(wait, 60);
    wait();
  });
}

/** Where the visitor goes once they are in; the server checks it again. */
function nextPath(): string {
  const back = new URLSearchParams(window.location.search).get("redirect");
  return back && back.startsWith("/") && !back.startsWith("//") ? back : "/home";
}

/** A prepared sign-in waits an hour on the server; well before that, renew. */
const STALE_AFTER_MS = 40 * 60 * 1000;

/**
 * Our own button, signing in inside the app.
 *
 * A trip to Google's sign-in page leaves the installed app for a page with
 * an address bar, which is what made signing in look like a website. Tapped,
 * this asks Chrome for Google's own account sheet instead (FedCM): it rises
 * over the app, and choosing an account signs in without leaving it. Nothing
 * is shown before the tap. Where the sheet cannot be shown (an older
 * browser, Chrome's cool-down after it was dismissed, Google unreachable)
 * the button falls back to the sign-in page, as does "Sign in another way".
 */
export function SignInForm() {
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const prepared = useRef<{ state: string; at: number } | null>(null);
  const preparing = useRef<Promise<boolean> | null>(null);
  // Set when a tap asked for the sheet; a second tap with nothing to show
  // for the first goes to the sign-in page rather than asking again.
  const askedSheet = useRef(false);

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) {
      // eslint-disable-next-line no-console
      console.warn("[sign-in]", err);
      setOauthError(explain(decodeURIComponent(err)));
    }
    void prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Ask the server for a state and nonce and hand Google the nonce, ahead
   *  of the tap so the sheet opens straight away. */
  function prepare(): Promise<boolean> {
    if (prepared.current && Date.now() - prepared.current.at < STALE_AFTER_MS) return Promise.resolve(true);
    if (preparing.current) return preparing.current;
    preparing.current = (async () => {
      try {
        const res = await fetch(`/api/auth/google/prepare?next=${encodeURIComponent(nextPath())}`, {
          cache: "no-store",
        });
        if (!res.ok) return false;
        const { clientId, state, hashedNonce } = (await res.json()) as {
          clientId: string;
          state: string;
          hashedNonce: string;
        };
        await loadGis();
        const google = (window as unknown as { google?: GoogleIdApi }).google;
        if (!google?.accounts?.id) return false;
        google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          itp_support: true,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: ({ credential }) => {
            if (credential) void finish(credential, state);
          },
        });
        prepared.current = { state, at: Date.now() };
        return true;
      } catch {
        return false;
      } finally {
        preparing.current = null;
      }
    })();
    return preparing.current;
  }

  async function finish(credential: string, state: string) {
    setBusy(true);
    setOauthError(null);
    try {
      const res = await fetch("/api/auth/google/id-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credential, state }),
      });
      const payload = (await res.json().catch(() => null)) as { redirectTo?: string; error?: string } | null;
      if (!res.ok || !payload?.redirectTo) throw new Error(payload?.error || "google_sign_in_failed");
      window.location.replace(payload.redirectTo);
    } catch (e) {
      setBusy(false);
      setOauthError(explain(e instanceof Error ? e.message : "google_sign_in_failed"));
      prepared.current = null;
      void prepare();
    }
  }

  /** The sign-in page: the way that always works, in a page of its own. */
  function viaPage() {
    start(() => {
      window.location.href = `/auth/google/start?next=${encodeURIComponent(nextPath())}`;
    });
  }

  async function go() {
    setOauthError(null);
    // No FedCM in this browser, or the sheet already failed to appear: the
    // page is the way in.
    if (!("IdentityCredential" in window) || askedSheet.current) return viaPage();
    askedSheet.current = true;
    const ok = await prepare();
    const google = (window as unknown as { google?: GoogleIdApi }).google;
    if (!ok || !google?.accounts?.id) return viaPage();
    google.accounts.id.prompt((n) => {
      // Skipped: the sheet could not be shown here. Use the page instead.
      if (n?.isSkippedMoment?.()) viaPage();
    });
  }

  const working = pending || busy;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => void go()}
        disabled={working}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-rule bg-white px-5 text-sm font-semibold text-brand-950 shadow-sm transition-colors hover:bg-paper-deep disabled:opacity-60"
      >
        {working ? <Loader2 className="size-4 animate-spin text-brand-800" /> : <GoogleIcon />}
        {busy ? "Signing you in…" : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={viaPage}
        disabled={working}
        className="-mt-1 self-center text-[12.5px] text-brand-900/60 underline-offset-2 hover:underline disabled:opacity-50"
      >
        Sign in another way
      </button>

      {oauthError ? (
        <div
          role="alert"
          className="rounded-md border border-iit-200 bg-iit-50 px-3 py-2 text-sm leading-5 text-iit-700"
        >
          {oauthError}
        </div>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.44.34-2.11V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.96l3.66-2.85z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
