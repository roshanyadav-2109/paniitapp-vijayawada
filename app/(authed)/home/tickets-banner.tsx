"use client";

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
    <div className="flex items-center gap-4 overflow-hidden rounded-lg border border-[#CFE0F7] bg-[#EAF2FD] p-4 sm:gap-6 sm:p-5">
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
            className="mx-0.5 inline-flex items-center rounded border border-dashed border-brand-800/40 bg-white px-1.5 py-px font-semibold tracking-wide text-brand-800"
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
            className="inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
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
      <TicketArt />
    </div>
  );
}

/** A ticket, drawn: the stand-in until the summit's own ticket artwork. */
function TicketArt() {
  return (
    <svg
      viewBox="0 0 120 80"
      aria-hidden="true"
      className="h-[76px] w-auto shrink-0 -rotate-6 drop-shadow-[0_8px_14px_rgba(13,9,48,0.25)] sm:h-[92px]"
    >
      <path
        d="M8 4h104a4 4 0 0 1 4 4v18a10 10 0 0 0 0 20v26a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V46a10 10 0 0 0 0-20V8a4 4 0 0 1 4-4Z"
        fill="#fff"
        stroke="#1B1464"
        strokeWidth="2.5"
      />
      <path d="M84 10v60" stroke="#1B1464" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="16" y="20" width="52" height="7" rx="3.5" fill="#1B1464" />
      <rect x="16" y="34" width="38" height="5" rx="2.5" fill="#1B1464" opacity=".35" />
      <rect x="16" y="45" width="44" height="5" rx="2.5" fill="#1B1464" opacity=".35" />
      <text x="100" y="45" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1B1464" transform="rotate(-90 100 41)">
        ADMIT
      </text>
    </svg>
  );
}
