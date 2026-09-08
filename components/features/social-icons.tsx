import Image from "next/image";

// Branded social marks served from /public/icons. Single source of truth so
// every "candidate details" surface (networking, attendee detail, exhibitor
// team, speaker card) renders the same icon set at matching visual weight.
//
// Each source PNG has a different amount of internal padding, so a uniform
// CSS size alone won't make them look the same. We render every mark inside
// the same square frame and apply a per-asset zoom so the visible glyph
// matches LinkedIn's edge-to-edge weight.

interface IconProps {
  /** Tailwind square size token (e.g. `size-[16px]`). Defaults to 16px. */
  className?: string;
}

function BadgeFrame({
  className,
  src,
  scale,
}: {
  className: string;
  src: string;
  scale: number;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
    >
      <Image
        src={src}
        alt=""
        width={48}
        height={48}
        style={{ transform: `scale(${scale})` }}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function LinkedInIcon({ className = "size-[16px]" }: IconProps) {
  // linkedin.png is edge-to-edge — no internal padding to compensate for.
  return <BadgeFrame className={className} src="/icons/linkedin.png" scale={1} />;
}

export function XIcon({ className = "size-[16px]" }: IconProps) {
  // x.png has ~18% transparent padding around the rounded-square mark.
  return <BadgeFrame className={className} src="/icons/x.png" scale={1.55} />;
}

export function GmailIcon({ className = "size-[16px]" }: IconProps) {
  // gmail.png envelope only fills ~80% of its canvas; with object-contain in
  // a square box it leaves vertical whitespace too, so zoom a bit more.
  return <BadgeFrame className={className} src="/icons/gmail.png" scale={1.1} />;
}
