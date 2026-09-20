"use client";

import Image from "next/image";
import { Download } from "@/components/icons";
import { useAppPrompt } from "@/hooks/use-app-prompt";
import { EVENT_INSTALL_ART, EVENT_NOTIFY_ART } from "@/lib/event-config";
import { openAppPrompt } from "@/lib/pwa";
import { cn } from "@/lib/utils";

/**
 * Standing offer to install the app, and once it is installed, to turn
 * notifications on.
 *
 * It sits on the ground under the masthead card, directly above the four
 * scale blocks. Mint rather than the gate pass's light blue, so two light
 * blocks on one screen do not read as one block split in half.
 *
 * The slide-up asks once and then stays quiet for a week; this is the way
 * back to it for somebody who dismissed it and changed their mind. It
 * disappears entirely when there is nothing left to ask for — installed, and
 * notifications already answered — taking its own top margin with it so the
 * panel closes up rather than keeping the gap.
 */
export function AppPromptBanner() {
  const { ready, pending } = useAppPrompt();
  if (!ready || !pending) return null;

  const isInstall = pending === "install";
  const art = isInstall ? EVENT_INSTALL_ART : EVENT_NOTIFY_ART;

  return (
    <div
      className={cn(
        // Both margins are its own, so the gap above and below match (the
        // scale row under it brings mt-3 of its own), and both disappear
        // with the banner when there is nothing to ask.
        "mb-2 mt-5 flex items-center gap-3.5 overflow-hidden rounded-lg p-4 sm:gap-4 sm:p-5",
        isInstall ? "bg-[#DCEFE4]" : "bg-[#D8E6FA]"
      )}
    >
      {/* Artwork on the left, opposite the gate pass below it, so the two
          banners are not the same layout twice. */}
      {art ? (
        <Image
          src={art}
          alt=""
          width={420}
          height={420}
          sizes="170px"
          // Portrait phone, landscape bell — matched by the space they take
          // rather than by height.
          className={
            isInstall
              ? "h-[92px] w-auto shrink-0 sm:h-[104px]"
              : "h-[74px] w-auto shrink-0 sm:h-[84px]"
          }
        />
      ) : null}

      {/* Right-aligned against the artwork on the left. */}
      <div className="min-w-0 flex-1 text-right">
        <p className="font-display text-[16px] font-semibold leading-snug text-brand-950 sm:text-[17px]">
          {isInstall ? "Install the summit app" : "Turn on notifications"}
        </p>
        <button
          type="button"
          onClick={() => openAppPrompt(pending)}
          className={cn(
            "mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-medium text-white transition-colors",
            // Install takes the deep green of its own block; notifications
            // stays on the navy every other button in the app uses.
            isInstall
              ? "bg-emerald-800 hover:bg-emerald-900"
              : "bg-brand-800 hover:bg-brand-900"
          )}
        >
          {isInstall ? <Download className="size-3.5" strokeWidth={1.8} /> : null}
          {isInstall ? "Install" : "Allow"}
        </button>
      </div>
    </div>
  );
}
