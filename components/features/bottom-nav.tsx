"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";


// The summit's own icon set (public/ui/icons-v3): a thin dark outline for
// the tabs you are not on, a solid blue shape for the one you are.
type Tab = { href: string; label: string; icon: string };
const ICONS = "/ui/icons-v3";

const TABS: Tab[] = [
  { href: "/home", label: "Home", icon: "nav-home" },
  { href: "/agenda", label: "Agenda", icon: "nav-agenda" },
  { href: "/attendees", label: "Network", icon: "nav-network" },
  { href: "/discuss", label: "Discuss", icon: "nav-discuss" },
  { href: "/exhibitors", label: "Expo", icon: "nav-expo" },
];

/** A sixth tab for organisers and admins, and nobody else. */
const ADMIN_TAB: Tab = { href: "/admin", label: "Admin", icon: "nav-admin" };

/** For session moderators: the questions sent to their sessions. An
 *  organiser who also moderates has the admin tab, which leads there too. */
const MODERATE_TAB: Tab = { href: "/moderate", label: "Questions", icon: "nav-questions" };

export function BottomNav({
  isAdmin = false,
  isModerator = false,
}: {
  isAdmin?: boolean;
  isModerator?: boolean;
}) {
  const extra = isAdmin ? ADMIN_TAB : isModerator ? MODERATE_TAB : null;
  const tabs = extra ? [...TABS, extra] : TABS;
  const pathname = usePathname();
  // A tap has to look answered before the page it asks for exists. The tab
  // you pressed lights up immediately and stays lit until the route it
  // belongs to is the one you are on — otherwise nothing happens on screen
  // for as long as the server takes, and the tap reads as missed.
  const [tapped, setTapped] = useState<string | null>(null);
  useEffect(() => setTapped(null), [pathname]);
  const shown = tapped ?? pathname;

  return (
    <nav
      aria-label="Primary"
      // Marked so anything that has to float above it can measure it rather
      // than carry a copy of its height that goes stale.
      data-bottom-nav
      // No shadow over the map: it meets the bar edge to edge, and the
      // shadow lay on it as a grey band.
      className={cn(
        "safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white lg:hidden",
        pathname === "/map" ? "" : "shadow-[0_-8px_24px_-18px_rgba(13,9,48,0.18)]"
      )}
    >
      <ul
        className={cn(
          "mx-auto grid h-[88px] w-full max-w-2xl",
          extra ? "grid-cols-6" : "grid-cols-5"
        )}
      >
        {tabs.map(({ href, label, icon }) => {
          const active =
            shown === href || (href !== "/home" && shown.startsWith(`${href}/`));
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                prefetch
                onClick={() => setTapped(href)}
                aria-current={
                  pathname === href ||
                  (href !== "/home" && pathname.startsWith(`${href}/`))
                    ? "page"
                    : undefined
                }
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1.5 px-0.5 transition-colors",
                  active ? "text-[#2F6FEB]" : "text-brand-950 hover:text-[#2F6FEB]"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ICONS}/${icon}${active ? "-selected" : ""}.svg`}
                  alt=""
                  width={26}
                  height={26}
                  className="size-[26px]"
                  draggable={false}
                />
                <span className="text-[10px] font-semibold leading-none tracking-tight">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
