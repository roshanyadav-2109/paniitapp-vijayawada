"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MyQrDialog } from "@/components/features/my-qr-dialog";

// The four tiles stack their icon over their label rather than sitting them
// side by side, so the icon reads as the thing you aim at and the label as
// its caption. Centred, because a stacked tile with left-aligned text leaves
// the icon floating over an edge it does not line up with.
// brand-800 (#1B1464), the same navy as the scale blocks these sit under.
// They were brand-950, a near-black picked to separate them from the navy
// masthead block above — that block is a white card now, so the reason is
// gone, and two rows of solid tiles in two different darks read as an
// accident rather than a distinction. Red was tried here and was far too
// loud across four solid blocks. The artwork is navy with a red
// accent, which would disappear on this ground, so the icons are knocked out
// to white — `brightness-0` flattens them to black first, then `invert`
// lifts that to white, which works on a raster PNG where a `fill` would not.
// The red detail is lost in that trade; it is small (the scan line, the
// calendar dot) and the alternative is an invisible icon.
const TILE =
  "flex flex-col items-center justify-center gap-2 rounded-lg bg-brand-800 px-3 py-4 text-center transition-colors hover:bg-brand-900 lg:py-5 [&_img]:brightness-0 [&_img]:invert";

const TILE_LABEL = "text-[13px] font-normal leading-tight text-white";

/**
 * Supplied flat artwork rather than the generated Solar set, so these are
 * <Image> not components. They are already brand navy with a red accent, so
 * nothing here tints them.
 */
function TileIcon({ src, size = 28 }: { src: string; size?: number }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

interface Props {
  role: string | null;
}

export function QuickActions({ role }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const canVerify = role === "volunteer" || role === "admin";
  const canAnnounce = role === "organizer" || role === "admin";

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className={TILE}
        >
          <TileIcon src="/ui/my-qr.webp" />
          <span className={TILE_LABEL}>My QR</span>
        </button>
        <ActionLink
          href="/scan"
          icon={<TileIcon src="/ui/scan-qr.webp" />}
          label="Scan QR"
        />
        <ActionLink
          href="mailto:summit@paniit.org"
          icon={<TileIcon src="/ui/contact-us.webp" />}
          label="Contact us"
        />
        <ActionLink
          href="/agenda"
          icon={<TileIcon src="/ui/agenda.webp" />}
          label="Agenda"
        />
      </div>

      {canVerify ? (
        <Link
          href="/scan?mode=verify"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 py-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-900 [&_img]:brightness-0 [&_img]:invert"
        >
          <TileIcon src="/ui/verify-attendee.webp" size={20} />
          Verify Attendee
        </Link>
      ) : null}

      {canAnnounce ? (
        <Link
          href="/admin#announce"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-800 bg-white px-4 py-3.5 text-[13px] font-semibold text-brand-800 transition-colors hover:bg-paper-deep"
        >
          <TileIcon src="/ui/post-announcement.webp" size={20} />
          Post Announcement
        </Link>
      ) : null}

      <MyQrDialog open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}

function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className={TILE}>
      <span className="text-brand-800">{icon}</span>
      <span className={TILE_LABEL}>{label}</span>
    </Link>
  );
}
