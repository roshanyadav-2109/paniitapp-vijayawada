"use client";

import { cn } from "@/lib/utils";
import { GmailIcon, LinkedInIcon, XIcon } from "./social-icons";

/**
 * Someone's networks as buttons rather than bare marks.
 *
 * A 16px logo is decoration: it does not say whether tapping it opens a
 * profile, follows someone or writes to them. Each is a button carrying the
 * verb that network uses, in that network's own colour — LinkedIn's blue
 * behind "Connect", Gmail's red behind "Email", and X's black on white with
 * black behind "Follow".
 *
 * The marks are handled one at a time rather than uniformly. LinkedIn's
 * cuts its glyph out of the tile, so knocking it white gives a white tile
 * with the button's blue showing through the "in". X's is a solid tile with
 * the glyph painted on, so the same treatment would flatten it to a white
 * square — it stays as supplied and blends into the black fill, leaving the
 * white X. Gmail's M keeps its own four colours on the red.
 *
 * `stopPropagation` matters wherever these sit inside something else
 * clickable, which on the networking card is the whole card.
 */
/**
 * Profiles are stored as people type them, which is often "linkedin.com/in/x"
 * with no scheme. A bare path in an href is a path on this site, so the
 * button opened a missing page in the app instead of the network.
 */
function externalHref(raw: string): string {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  return `https://${v.replace(/^\/+/, "")}`;
}

export function SocialActions({
  linkedin,
  twitter,
  email,
  className,
  size = "sm",
}: {
  linkedin?: string | null;
  twitter?: string | null;
  email?: string | null;
  className?: string;
  /** `md` for a profile page, `sm` on a list card. */
  size?: "sm" | "md";
}) {
  const items: {
    href: string;
    label: string;
    action: string;
    icon: React.ReactNode;
    tone: string;
  }[] = [];

  const glyph = size === "md" ? "size-[16px]" : "size-[14px]";

  if (linkedin) {
    items.push({
      href: externalHref(linkedin),
      label: "LinkedIn",
      action: "Connect",
      icon: <LinkedInIcon className={glyph} />,
      // LinkedIn's own blue, filled. The mark is a blue tile with a
      // white glyph, which disappears into it, so it is knocked out
      // to white the way the home tiles do it.
      tone: "border-[#0A66C2] bg-[#0A66C2] text-white [&_img]:brightness-0 [&_img]:invert",
    });
  }
  if (twitter) {
    items.push({
      href: externalHref(twitter),
      label: "X",
      action: "Follow",
      icon: <XIcon className={glyph} />,
      tone: "border-black bg-black text-white",
    });
  }
  if (email) {
    items.push({
      href: `mailto:${email}`,
      label: "Email",
      action: "Email",
      icon: <GmailIcon className={glyph} />,
      tone: "border-[#C5221F] bg-[#C5221F] text-white",
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target={it.href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          aria-label={`${it.action} on ${it.label}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border font-medium transition-opacity hover:opacity-80",
            size === "md"
              ? "h-9 px-3.5 text-[13px]"
              : "h-7 px-2.5 text-[11.5px]",
            it.tone,
          )}
        >
          {it.icon}
          {it.action}
        </a>
      ))}
    </div>
  );
}
