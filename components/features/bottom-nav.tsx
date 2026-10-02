"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  NavAdmin, NavAdminActive, NavAgenda, NavAgendaActive, NavDiscuss, NavDiscussActive,
  NavExpo, NavExpoActive, NavHome, NavHomeActive, NavModerate, NavModerateActive,
  NavNetwork, NavNetworkActive, type LucideIcon,
} from "@/components/icons";

// Each tab has a line icon and a filled one. The tab you are on shows the
// filled icon in the brand colour; the rest are black line icons. Shape
// carries the difference, not a faded copy of the same picture.
type Tab = { href: string; label: string; icon: LucideIcon; activeIcon: LucideIcon };

const TABS: Tab[] = [
  { href: "/home", label: "Home", icon: NavHome, activeIcon: NavHomeActive },
  { href: "/agenda", label: "Agenda", icon: NavAgenda, activeIcon: NavAgendaActive },
  { href: "/attendees", label: "Network", icon: NavNetwork, activeIcon: NavNetworkActive },
  { href: "/discuss", label: "Discuss", icon: NavDiscuss, activeIcon: NavDiscussActive },
  { href: "/exhibitors", label: "Expo", icon: NavExpo, activeIcon: NavExpoActive },
];

/** A sixth tab for organisers and admins, and nobody else. */
const ADMIN_TAB: Tab = { href: "/admin", label: "Admin", icon: NavAdmin, activeIcon: NavAdminActive };

/** For session moderators: the questions sent to their sessions. An
 *  organiser who also moderates has the admin tab, which leads there too. */
const MODERATE_TAB: Tab = { href: "/moderate", label: "Questions", icon: NavModerate, activeIcon: NavModerateActive };

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
        {tabs.map(({ href, label, icon: LineIcon, activeIcon: FilledIcon }) => {
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
                  active ? "text-brand-800" : "text-brand-950 hover:text-brand-800"
                )}
              >
                {active ? (
                  <FilledIcon className="size-6" />
                ) : (
                  <LineIcon className="size-6" strokeWidth={1.6} />
                )}
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
