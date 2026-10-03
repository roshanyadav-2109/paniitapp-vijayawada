"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GatePassDialog } from "@/components/features/gatepass-dialog";

/**
 * Banner for the gate pass, under the four action tiles.
 *
 * The pass already has a floating button, but a FAB is a 48px circle in the
 * corner that says nothing about what it holds — and the pass is the one
 * thing everybody needs at the door. This says it in words and opens the
 * same dialog.
 *
 * Light blue ground: a step up in saturation from the page's own tint, so
 * the banner reads as a block without becoming a third dark mass under the
 * navy tiles. The phone's black frame carries itself against it, which it
 * could not do on the near-black this started as.
 */
export function GatePassBanner({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 overflow-hidden rounded-lg bg-[#D8E6FA] p-4 sm:gap-5 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-semibold leading-snug text-brand-950 sm:text-[19px]">
            Access Gate Pass QR
          </p>
          <p className="mt-1 text-[12.5px] leading-5 text-brand-950/70">
            {signedIn
              ? "Your entry pass for the venue gate. Have it open when you reach the desk."
              : "Your badge is issued to your account. Log in to see it."}
          </p>
          {/* A guest has no pass to open: the button that opened an empty
              dialog now goes to the door it was asking them through. */}
          {signedIn ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
            >
              Click Here
            </button>
          ) : (
            <Link
              href="/login?redirect=%2Fhome"
              className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
            >
              Login
            </Link>
          )}
        </div>

        {/* The supplied render, cut off its studio background, so what sits
            here is the handset and not the black box it was shot in. */}
        <Image
          src="/ui/gatepass-phone.webp"
          alt=""
          width={420}
          height={783}
          sizes="110px"
          className="h-[168px] w-auto shrink-0 drop-shadow-[0_12px_22px_rgba(13,9,48,0.35)] sm:h-[190px]"
          priority={false}
        />
      </div>

      <GatePassDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
