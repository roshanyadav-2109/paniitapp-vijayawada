"use client";

import { useEffect } from "react";

/** A script the page needs could not be loaded or found: after a new
 *  deploy the open page can ask for a file the server no longer has. */
function isLoadError(error: Error) {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk|loading css chunk|reading 'call'|failed to fetch dynamically imported module/i.test(
      error.message
    )
  );
}

const RELOADED_AT = "authed-error-reloaded-at";

export default function AuthedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[authed error]", error);

    // A page built from files that have since changed mends itself with one
    // fresh load. Once only, a minute apart, so a real fault cannot loop.
    if (isLoadError(error)) {
      try {
        const last = Number(sessionStorage.getItem(RELOADED_AT) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOADED_AT, String(Date.now()));
          window.location.reload();
        }
      } catch {
        // storage refused: leave it to the button
      }
    }
  }, [error]);

  // No red card and no error text: a quiet line and a way to try again.
  // What went wrong is in the console for whoever is looking into it.
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <p className="text-[14px] text-brand-900/70">This didn&rsquo;t load.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white hover:bg-brand-900"
      >
        Try again
      </button>
    </div>
  );
}
