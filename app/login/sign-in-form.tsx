"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "@/components/icons";
import { isStandalone } from "@/lib/pwa";

/** The slice of Google's script this file uses. */
interface GoogleIdApi {
  accounts?: {
    id?: {
      initialize: (opts: {
        client_id: string;
        nonce?: string;
        use_fedcm_for_prompt?: boolean;
        use_fedcm_for_button?: boolean;
        itp_support?: boolean;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        callback: (res: { credential?: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        opts: Record<string, string | number>
      ) => void;
      prompt: () => void;
    };
  };
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Loads Google's script once, and resolves when it is there. */
function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) {
      // Already requested by an earlier mount; it may still be in flight.
      const done = () =>
        (window as unknown as { google?: GoogleIdApi }).google?.accounts?.id
          ? resolve()
          : setTimeout(done, 50);
      done();
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gis_unavailable"));
    document.head.appendChild(s);
  });
}

/** Where the visitor goes once they are in. */
function nextPath(): string {
  const back = new URLSearchParams(window.location.search).get("redirect");
  return back && back.startsWith("/") && !back.startsWith("//") ? back : "/home";
}

export function SignInForm() {
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [googlePending, startGoogle] = useTransition();
  const [gisReady, setGisReady] = useState(false);
  const gisRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setOauthError(decodeURIComponent(err));
  }, []);

  // Google Identity Services: the token exchange happens in an overlay the
  // script owns, so the app never navigates away and an installed copy stays
  // an installed copy. The state and nonce come from our own server first;
  // the credential goes back to the same endpoint the redirect flow posts to.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const slot = gisRef.current;
      if (!slot) return;

      const res = await fetch(
        `/api/auth/google/prepare?next=${encodeURIComponent(nextPath())}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const { clientId, state, hashedNonce } = (await res.json()) as {
        clientId: string;
        state: string;
        hashedNonce: string;
      };
      if (cancelled) return;

      await loadGis();
      const google = (window as unknown as { google?: GoogleIdApi }).google;
      if (cancelled || !google?.accounts?.id || !gisRef.current) return;

      google.accounts.id.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        // Chrome's own account dialog, drawn over the page rather than in a
        // popup window — in an installed copy a popup means being thrown out
        // into the browser halfway through signing in.
        use_fedcm_for_prompt: true,
        // The same dialog for the button, but only where it is the better of
        // the two. Asking for it everywhere breaks the button on a desktop: a
        // browser without FedCM, or one with third-party sign-in switched off
        // for the site, then has no dialog to show and no popup to fall back
        // to, so the click does nothing at all and says nothing either. Off,
        // the click opens the ordinary popup, which every browser has. The
        // installed app keeps FedCM, where the popup is the thing that breaks.
        use_fedcm_for_button: isStandalone(),
        itp_support: true,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: ({ credential }) => {
          if (!credential) return;
          void completeSignIn(credential, state).catch((e: unknown) => {
            setOauthError(e instanceof Error ? e.message : "google_sign_in_failed");
          });
        },
      });
      google.accounts.id.renderButton(gisRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        logo_alignment: "center",
        width: Math.min(Math.round(gisRef.current.clientWidth) || 320, 400),
      });
      setGisReady(true);

      // One Tap, which is the only sign-in that never shows a web page: with
      // FedCM the account chooser is drawn by the browser itself, so someone
      // already signed in to Google picks their account and is straight in.
      // It shows nothing at all if there is no Google session here, which is
      // why the button above stays — tapping that opens Google's own popup,
      // and there is no way around that one: Google refuses to authenticate
      // inside an embedded view, by policy.
      google.accounts.id.prompt();
    }

    void boot().catch(() => {
      /* leaves the redirect button showing */
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function completeSignIn(credential: string, state: string) {
    const response = await fetch("/api/auth/google/id-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: credential, state }),
    });
    const payload = (await response.json().catch(() => null)) as {
      redirectTo?: string;
      error?: string;
    } | null;
    if (!response.ok || !payload?.redirectTo) {
      throw new Error(payload?.error || "google_sign_in_failed");
    }
    window.location.replace(payload.redirectTo);
  }

  function handleGoogle() {
    setOauthError(null);
    startGoogle(() => {
      // Come back to whatever the visitor was reading. Every sign-in prompt
      // in the app links here as /login?redirect=<path>; without this the
      // trip always ended on the home screen and lost their place. Only a
      // same-site path is honoured — safeNext on the server checks again.
      const back = new URLSearchParams(window.location.search).get("redirect");
      const next = back && back.startsWith("/") && !back.startsWith("//") ? back : "/home";
      window.location.href = `/auth/google/start?next=${encodeURIComponent(next)}`;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Google's own button, rendered by their script into this slot. It
          signs in without leaving the page, which is what keeps an installed
          copy of the app out of the system browser. */}
      <div ref={gisRef} className="min-h-[48px] w-full [&>div]:!w-full" />

      {/* Shown when their script cannot load, or has not decided to offer a
          button — an ad blocker, a locked-down network, an older webview.
          This is the old redirect, which works everywhere and costs a trip
          out to accounts.google.com. */}
      {gisReady ? null : (
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googlePending}
          className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-rule bg-white px-5 text-sm font-semibold text-brand-950 shadow-sm transition-colors hover:bg-paper-deep disabled:opacity-60"
        >
          {googlePending ? (
            <Loader2 className="size-4 animate-spin text-brand-800" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>
      )}

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
