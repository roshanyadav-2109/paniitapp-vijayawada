import Image from "next/image";
import Link from "next/link";
import { EVENT_LOGIN_ART } from "@/lib/event-config";
import { cn } from "@/lib/utils";

/**
 * Login prompt for a guest, shown where the content stops.
 *
 * The app no longer puts a wall in front of everything — someone handed a
 * link the week before the summit can read the programme, the sectors and
 * the expo first. This asks them to log in at the point where the screen
 * would otherwise stop being useful.
 *
 * A line and a button, nothing else. It counted sessions and listed
 * features for a while, which made a sales pitch out of a door — and the
 * count went stale the moment the programme changed.
 *
 * `next` returns them to what they were reading rather than to the home
 * screen. The artwork slot is empty until EVENT_LOGIN_ART is set, and the
 * banner lays out either way.
 */
export function LoginCta({
  next,
  className,
}: {
  /** Path to return to after logging in. */
  next?: string;
  className?: string;
}) {
  const href = next ? `/login?redirect=${encodeURIComponent(next)}` : "/login";

  return (
    <div
      className={cn(
        "flex items-center gap-3 overflow-hidden rounded-lg bg-[#D8E6FA] p-4 sm:gap-5 sm:p-5",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px] font-semibold leading-snug text-brand-950 sm:text-[19px]">
          Sign in to continue
        </p>
        <Link
          href={href}
          className="mt-3 inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
        >
          Login
        </Link>
      </div>

      {EVENT_LOGIN_ART ? (
        <Image
          src={EVENT_LOGIN_ART}
          alt=""
          width={420}
          height={420}
          sizes="120px"
          className="h-[104px] w-auto shrink-0 sm:h-[120px]"
        />
      ) : null}
    </div>
  );
}
