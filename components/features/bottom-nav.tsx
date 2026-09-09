"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavHome, NavHomeActive,
  NavAgenda, NavAgendaActive,
  NavNetwork, NavNetworkActive,
  NavDiscuss, NavDiscussActive,
  NavExpo, NavExpoActive,
  NavMeetings, NavMeetingsActive,
} from "@/components/icons";
import { cn } from "@/lib/utils";

// Linear when inactive, bold when active — Solar's own convention, and a
// clearer state change than nudging stroke width.
const TABS = [
  { href: "/home", label: "Home", icon: NavHome, iconActive: NavHomeActive },
  { href: "/agenda", label: "Agenda", icon: NavAgenda, iconActive: NavAgendaActive },
  { href: "/attendees", label: "Network", icon: NavNetwork, iconActive: NavNetworkActive },
  { href: "/discuss", label: "Discuss", icon: NavDiscuss, iconActive: NavDiscussActive },
  { href: "/exhibitors", label: "Expo", icon: NavExpo, iconActive: NavExpoActive },
  { href: "/meetings", label: "Meetings", icon: NavMeetings, iconActive: NavMeetingsActive },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white shadow-[0_-8px_24px_-18px_rgba(13,9,48,0.18)] lg:hidden"
    >
      <ul className="mx-auto grid h-[88px] w-full max-w-2xl grid-cols-6">
        {TABS.map(({ href, label, icon: Icon, iconActive: IconActive }) => {
          const active =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(`${href}/`));
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1.5 px-0.5 transition-colors",
                  active ? "text-brand-800" : "text-brand-800/45 hover:text-brand-800"
                )}
              >
                {active ? (
                  <IconActive className="h-[22px] w-[22px]" />
                ) : (
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
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
