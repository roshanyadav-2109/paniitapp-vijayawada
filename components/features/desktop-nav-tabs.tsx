"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/agenda", label: "Agenda" },
  { href: "/attendees", label: "Networking" },
  { href: "/exhibitors", label: "Exhibitors" },
  { href: "/meetings", label: "Meetings" },
] as const;

export function DesktopNavTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="hidden lg:flex lg:items-center lg:gap-6"
    >
      {TABS.map(({ href, label }) => {
        const active =
          pathname === href ||
          (href !== "/home" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-1 py-3 text-[13px] font-semibold tracking-tight transition-colors",
              active
                ? "text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            {label}
            {active ? (
              <span
                className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-white"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
