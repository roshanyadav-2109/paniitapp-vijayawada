import Image from "next/image";
import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { rethrowIfRedirect } from "@/lib/redirect";
import { initials } from "@/lib/utils";
import { NotificationsBell } from "./notifications-bell";
import { DesktopNavTabs } from "./desktop-nav-tabs";

const SUMMIT_WHATSAPP_URL = "https://chat.whatsapp.com/DFwlo56dAu83SW6fKX4I7H";

const SOCIAL_LINKS = [
  {
    href: "https://x.com/paniitindia",
    label: "PAN IIT on X",
    Icon: XMark,
  },
  {
    href: "https://instagram.com/paniitindia",
    label: "PAN IIT on Instagram",
    Icon: InstagramMark,
  },
  {
    href: "https://linkedin.com/company/paniitalumni",
    label: "PAN IIT on LinkedIn",
    Icon: LinkedInMark,
  },
] as const;

function firstName(full: string | null | undefined): string {
  if (!full) return "there";
  return full.trim().split(/\s+/)[0];
}

export async function TopBar() {
  let name: string | null = null;
  let photoUrl: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, photo_url")
        .eq("id", user.id)
        .maybeSingle();
      name = (data?.full_name as string | null) ?? null;
      photoUrl = (data?.photo_url as string | null) ?? null;
    }
  } catch (err) {
    rethrowIfRedirect(err);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header className="safe-top sticky top-0 z-40">
        {/* TIER 1 — white action bar (logo left, actions right). Renders as
            the single-row mobile top bar too. */}
        <div className="border-b border-brand-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6 lg:h-[68px] lg:px-8">
            {/* Desktop: PAN IIT lockup as the brand mark */}
            <Link
              href="/home"
              aria-label="PAN IIT 2026 home"
              className="hidden shrink-0 items-center lg:flex"
            >
              <Image
                src="/logo/paniit.png"
                alt="PAN IIT Alumni India"
                width={512}
                height={220}
                priority
                className="h-10 w-auto"
              />
            </Link>

            {/* Mobile: avatar greeting on the left */}
            <Link
              href="/me"
              className="group flex min-w-0 items-center gap-2.5 rounded-full pr-2 transition-colors hover:bg-brand-50/60 lg:hidden"
            >
              <Avatar className="size-9 shrink-0 ring-1 ring-brand-100">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt={name ?? "Profile"} />
                ) : null}
                <AvatarFallback className="bg-brand-50 text-[12px] font-semibold text-brand-800">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <p className="min-w-0 truncate text-sm font-semibold text-brand-900">
                Hello, {firstName(name)}{" "}
                <span className="inline-block align-[-1px]" aria-hidden>
                  👋
                </span>
              </p>
            </Link>

            <div className="flex-1" aria-hidden />

            {/* Social icons — desktop only, mirroring paniit.org */}
            <div className="hidden items-center gap-0.5 pr-1 lg:flex">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-grid size-9 place-items-center rounded-full text-brand-800/70 transition-colors hover:bg-brand-50 hover:text-brand-900"
                >
                  <Icon className="size-[18px]" />
                </a>
              ))}
              <span className="mx-2 h-5 w-px bg-brand-100" aria-hidden />
            </div>

            <div className="flex shrink-0 items-center gap-1 lg:gap-2">
              <a
                href={SUMMIT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Summit help on WhatsApp"
                className="inline-grid size-10 place-items-center rounded-full transition-transform hover:-translate-y-0.5"
              >
                <WhatsAppMark className="size-[26px]" />
              </a>
              <NotificationsBell />
              <Link
                href="/me"
                aria-label="Profile"
                className="hidden shrink-0 lg:inline-flex"
              >
                <Avatar className="size-9 ring-1 ring-brand-100 transition-shadow hover:ring-2 hover:ring-brand-200">
                  {photoUrl ? (
                    <AvatarImage src={photoUrl} alt={name ?? "Profile"} />
                  ) : null}
                  <AvatarFallback className="bg-brand-50 text-[12px] font-semibold text-brand-800">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </div>

        {/* TIER 2 — navy nav strip (desktop only) with the tab links centred */}
        <div className="hidden bg-brand-900 lg:block">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-center px-8">
            <DesktopNavTabs />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2H21l-6.49 7.41L22 22h-6.43l-4.78-6.26L4.94 22H2.18l6.94-7.93L2 2h6.59l4.33 5.72L18.244 2zm-1.13 18.4h1.55L7.01 3.52H5.34L17.114 20.4z" />
    </svg>
  );
}

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        fill="#25D366"
        d="M16.05 4C9.42 4 4.04 9.38 4.04 16.01a11.94 11.94 0 001.72 6.16L4 28l5.99-1.72A12 12 0 0028.06 16C28.06 9.38 22.68 4 16.05 4zm0 21.94c-1.94 0-3.83-.52-5.5-1.5l-.39-.23-3.55 1.02 1.04-3.46-.25-.4a9.94 9.94 0 1118.6-5.36 9.94 9.94 0 01-9.95 9.93zm5.7-7.45c-.31-.16-1.85-.91-2.14-1.01-.29-.11-.5-.16-.71.16-.21.31-.81 1.01-.99 1.22-.18.21-.36.23-.67.08-.31-.16-1.32-.49-2.51-1.55-.93-.83-1.55-1.85-1.73-2.16-.18-.31-.02-.48.13-.63.13-.13.31-.36.47-.54.16-.18.21-.31.32-.51.11-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.25-.61-.51-.53-.71-.54-.18-.01-.39-.01-.6-.01-.21 0-.55.08-.83.39-.29.31-1.09 1.06-1.09 2.59 0 1.53 1.11 3.01 1.27 3.22.16.21 2.19 3.34 5.31 4.69.74.32 1.32.51 1.78.65.74.24 1.42.21 1.96.13.6-.09 1.85-.75 2.11-1.47.26-.72.26-1.34.18-1.47-.08-.13-.29-.21-.6-.36z"
      />
    </svg>
  );
}
