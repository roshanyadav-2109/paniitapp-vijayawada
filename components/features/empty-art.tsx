import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The illustration for an empty, error or not-yet state.
 *
 * One component for all of them so the whole set is drawn at one size and
 * one weight wherever it appears — the app had four different empty-state
 * treatments and a different stroke icon in each.
 *
 * `alt=""`: every one of these sits directly above a heading that says the
 * same thing in words, so announcing the picture too would just repeat it.
 */
export type EmptyArtName =
  | "empty-calendar"
  | "empty-bookmark"
  | "empty-meetings"
  | "empty-chat"
  | "empty-expo"
  | "empty-search"
  | "empty-network"
  | "empty-discussion"
  | "empty-map"
  | "empty-sponsors"
  | "empty-badge"
  | "empty-announcements"
  | "empty-qa"
  | "empty-office-hours"
  | "empty-profile"
  | "empty-team"
  | "error-generic"
  | "camera-blocked"
  | "restricted"
  | "not-found"
  | "empty-checkins"
  | "empty-questions";

export function EmptyArt({
  name,
  className,
}: {
  name: EmptyArtName;
  /** Defaults to 64px — these carry detail a 40px icon tile cannot hold. */
  className?: string;
}) {
  return (
    <Image
      src={`/empty/${name}.webp`}
      alt=""
      width={320}
      height={320}
      sizes="96px"
      className={cn("size-16 shrink-0", className)}
    />
  );
}
