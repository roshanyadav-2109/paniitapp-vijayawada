"use client";

import { useEffect, useState, useTransition } from "react";
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

/**
 * One button of our own. Google's script used to draw its own button and
 * put its account dialog over the page, which blocked the screen and named
 * the wrong address; this goes straight to Google's sign-in and comes back
 * to whichever address the visitor started on.
 */
export function SignInForm() {
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) {
      // eslint-disable-next-line no-console
      console.warn("[sign-in]", err);
      setOauthError(explain(decodeURIComponent(err)));
    }
  }, []);

  function go() {
    setOauthError(null);
    start(() => {
      // Back to whatever the visitor was reading; the server checks it again.
      const back = new URLSearchParams(window.location.search).get("redirect");
      const next = back && back.startsWith("/") && !back.startsWith("//") ? back : "/home";
      window.location.href = `/auth/google/start?next=${encodeURIComponent(next)}`;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-rule bg-white px-5 text-sm font-semibold text-brand-950 shadow-sm transition-colors hover:bg-paper-deep disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin text-brand-800" /> : <GoogleIcon />}
        Continue with Google
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
