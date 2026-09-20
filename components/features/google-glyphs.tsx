/**
 * Google's own marks for a time and a place.
 *
 * The app's line icons are drawn in one weight and one colour, which is
 * right for a row of controls and wrong for these two: a session's time and
 * its room are the facts people scan the page for, and everybody already
 * reads a red teardrop as "where" and a clock face as "when" without having
 * to look twice. Same shapes and same palette Google uses, drawn here rather
 * than loaded, so they cost nothing and cannot 404.
 */

/** Maps' red teardrop. */
export function GoogleMapPin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        fill="#EA4335"
        d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
      />
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}

/** A clock face in Google blue, hands at ten past ten as every clock is. */
export function GoogleClock({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9.2" fill="#4285F4" />
      <circle cx="12" cy="12" r="7.1" fill="#fff" />
      <path
        d="M12 7.4v4.9l3.1 1.9"
        fill="none"
        stroke="#1A73E8"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
