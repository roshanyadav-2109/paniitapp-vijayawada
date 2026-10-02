/**
 * The networks' own marks, drawn rather than loaded, in their own colours.
 *
 * One set for the whole app: the Connect row on home and the share buttons
 * under the summit photo both use these, so the two never drift apart.
 */

interface LogoProps {
  className?: string;
}

export function LinkedInLogo({ className = "size-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.06 9.5h2.55v8.2H7.06V9.5zm1.27-3.7a1.48 1.48 0 110 2.96 1.48 1.48 0 010-2.96zM11.4 9.5h2.45v1.12h.04c.34-.64 1.18-1.32 2.42-1.32 2.59 0 3.07 1.7 3.07 3.92v4.48h-2.55v-3.97c0-.95-.02-2.17-1.32-2.17-1.33 0-1.53 1.03-1.53 2.1v4.04H11.4V9.5z"
      />
    </svg>
  );
}

export function InstagramLogo({ className = "size-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FCAF45" />
          <stop offset="30%" stopColor="#F77737" />
          <stop offset="55%" stopColor="#E1306C" />
          <stop offset="85%" stopColor="#833AB4" />
          <stop offset="100%" stopColor="#405DE6" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.5" cy="7.6" r="0.9" fill="#fff" />
    </svg>
  );
}

export function XLogo({ className = "size-7" }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        d="M16.05 5h2.16l-4.72 5.4L19 19h-4.34l-3.4-4.45L7.32 19H5.15l5.05-5.78L5 5h4.45l3.07 4.06L16.05 5zm-.76 12.7h1.2L8.78 6.23H7.5L15.29 17.7z"
        fill="#fff"
      />
    </svg>
  );
}
