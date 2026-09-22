"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Supplied flat artwork, one icon per tab rather than the linear/bold pair
// the generated Solar set used. A single flat icon cannot carry that
// distinction, so the selected state is opacity instead: full strength when
// active, dimmed when not — the same contrast the labels already use.
const TABS = [
  { href: "/home", label: "Home", icon: "/ui/nav-home.webp" },
  { href: "/agenda", label: "Agenda", icon: "/ui/nav-agenda.webp" },
  { href: "/attendees", label: "Network", icon: "/ui/nav-network.webp" },
  { href: "/discuss", label: "Discuss", icon: "/ui/nav-discuss.webp" },
  { href: "/exhibitors", label: "Expo", icon: "/ui/nav-expo.webp" },
  { href: "/meetings", label: "Meetings", icon: "/ui/nav-meetings.webp" },
] as const;

export function BottomNav() {
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
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white shadow-[0_-8px_24px_-18px_rgba(13,9,48,0.18)] lg:hidden"
    >
      <ul className="mx-auto grid h-[88px] w-full max-w-2xl grid-cols-6">
        {TABS.map(({ href, label, icon }) => {
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
                  active ? "text-brand-800" : "text-brand-800/45 hover:text-brand-800"
                )}
              >
                <Image
                  src={icon}
                  alt=""
                  width={22}
                  height={22}
                  className={cn(
                    "h-[22px] w-[22px] transition-opacity",
                    active ? "opacity-100" : "opacity-40"
                  )}
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
