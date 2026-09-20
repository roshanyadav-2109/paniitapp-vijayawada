"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, RefreshCw } from "@/components/icons";
import { EmptyArt } from "@/components/features/empty-art";

export default function AgendaDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[agenda detail error]", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-rule bg-white p-6 text-center">
        <EmptyArt name="error-generic" className="mx-auto size-28" />
        <h1 className="mt-3 font-display text-base font-semibold text-brand-950">
          We couldn&apos;t load this session
        </h1>
        <p className="mt-1.5 text-[13px] leading-6 text-brand-900/70">
          Something went wrong while opening this session. The rest of the
          agenda is still working — try again in a moment.
        </p>
        {error.digest ? (
          <p className="mt-2 text-[10px] tracking-wide text-brand-900/40">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-800 px-3.5 text-sm font-medium text-white hover:bg-brand-900"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
            Try again
          </button>
          <Link
            href="/agenda"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule bg-white px-3.5 text-sm font-medium text-brand-900 hover:bg-paper-deep/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Back to agenda
          </Link>
        </div>
      </div>
    </div>
  );
}
