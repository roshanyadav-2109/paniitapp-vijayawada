import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// WhatsApp-style fallback: soft grey disc with a white head + shoulders
// silhouette. Used on profile detail surfaces where the absence of a
// photo deserves a recognisable "no profile picture" indicator rather
// than initials.

function SilhouetteSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <circle cx="32" cy="22" r="11" fill="#ffffff" />
      <path d="M10 60 Q 10 38 32 38 Q 54 38 54 60 Z" fill="#ffffff" />
    </svg>
  );
}

export function ProfileAvatar({
  photoUrl,
  name,
  className,
  ringClassName,
}: {
  photoUrl: string | null | undefined;
  name: string | null | undefined;
  /** Tailwind size + position classes for the avatar itself. */
  className?: string;
  /** Optional ring/border treatment passed through. */
  ringClassName?: string;
}) {
  return (
    <Avatar
      className={cn(
        "ring-2 ring-brand-50",
        ringClassName,
        className ?? "size-24"
      )}
    >
      {photoUrl ? (
        <AvatarImage src={photoUrl} alt={name ?? ""} />
      ) : null}
      <AvatarFallback className="bg-slate-300/80">
        <SilhouetteSvg className="h-[88%] w-[88%] translate-y-[6%]" />
      </AvatarFallback>
    </Avatar>
  );
}
