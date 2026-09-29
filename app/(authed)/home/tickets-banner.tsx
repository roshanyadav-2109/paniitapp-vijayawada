"use client";

import Image from "next/image";
import { useState } from "react";

export const TICKETS_URL = "https://www.paniit.org/events/tickets/21873";
export const TICKETS_CODE = "STARTUP1000";

/**
 * Tickets, under the event card: where to register, and the code that
 * takes something off.
 *
 * Laid out as the gate pass banner is, words on the left and the object on
 * the right, on a rose tint of the IIT red: the blue is the pass's, the
 * green the install banner's and the cream the photo frame's. Registering
 * copies the code on the way out, so it is ready to paste at the checkout
 * on the other site.
 */
export function TicketsBanner() {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    void navigator.clipboard
      ?.writeText(TICKETS_CODE)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  }

  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-lg border border-rule bg-white shadow-[0_6px_18px_-14px_rgba(13,9,48,0.4)] p-4 sm:gap-6 sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px] font-semibold leading-snug text-brand-950 sm:text-[19px]">
          Get your tickets
        </p>
        <p className="mt-1 text-[12.5px] leading-5 text-brand-950/70">
          Use code{" "}
          <button
            type="button"
            onClick={copyCode}
            aria-label={`Copy the code ${TICKETS_CODE}`}
            className="mx-0.5 inline-flex items-center rounded border border-dashed border-brand-800/40 bg-paper px-1.5 py-px font-semibold tracking-wide text-brand-800"
          >
            {TICKETS_CODE}
          </button>{" "}
          for a discount.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <a
            href={TICKETS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={copyCode}
            className="inline-flex h-10 items-center whitespace-nowrap rounded-md bg-[#FFC93C] px-5 text-[13.5px] font-semibold text-brand-950 transition-colors hover:bg-[#F5BB1F]"
          >
            Get tickets
          </a>
          <span
            aria-live="polite"
            className={`text-[12px] text-brand-900/60 transition-opacity ${copied ? "opacity-100" : "opacity-0"}`}
          >
            Code copied
          </span>
        </div>
      </div>
      <Image
        src="/ui/admin/tickets.webp"
        alt=""
        width={512}
        height={512}
        sizes="96px"
        className="size-[84px] shrink-0 sm:size-24"
      />
    </div>
  );
}
