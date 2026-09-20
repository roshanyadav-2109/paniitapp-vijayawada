"use client";

import { useEffect } from "react";
import { EmptyArt } from "@/components/features/empty-art";

export default function AuthedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to console for the user/Vercel logs.
    // eslint-disable-next-line no-console
    console.error("[authed error]", error);
  }, [error]);

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-iit-200 bg-iit-50 p-6 text-center">
        <EmptyArt name="error-generic" className="mx-auto size-28" />
        <h1 className="mt-3 font-display text-base font-semibold text-brand-900">Something broke on this page</h1>
        <p className="mt-2 text-xs text-brand-900/70">{error.message || "Unknown client error."}</p>
        {error.digest ? (
          <p className="mt-1 text-[10px] text-brand-900/45">digest: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-sm font-medium text-white hover:bg-brand-900"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
