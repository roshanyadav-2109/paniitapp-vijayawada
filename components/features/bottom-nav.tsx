"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, Store, CalendarClock } from "lucide-react";
import { NetworkNodes, PremiumHouse } from "./nav-icons";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "Home", icon: PremiumHouse },
  { href: "/agenda", label: "Agenda", icon: Mic },
  { href: "/attendees", label: "Networking", icon: NetworkNodes },
  { href: "/exhibitors", label: "Exhibitors", icon: Store },
  { href: "/meetings", label: "Meetings", icon: CalendarClock },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white shadow-[0_-8px_24px_-18px_rgba(13,9,48,0.18)] lg:hidden"
    >
      <ul className="mx-auto grid h-[72px] w-full max-w-2xl grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(`${href}/`));
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1.5 transition-colors",
                  active ? "text-brand-800" : "text-brand-800/45 hover:text-brand-800"
                )}
              >
                <Icon
                  className="h-[20px] w-[20px]"
                  strokeWidth={active ? 2.25 : 1.7}
                />
                <span className="text-[11px] font-semibold leading-none tracking-tight">
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
