import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Noto_Sans_Telugu } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { EVENT_APP_NAME, EVENT_NAME, EVENT_TAGLINE } from "@/lib/event-config";
import "./globals.css";

// Display face for titles. Fraunces is a high-contrast variable serif with
// `SOFT` (terminal rounding) and `WONK` (swashy alternates) axes; we run it
// with the wonk off and softness low so it reads institutional rather than
// cute, and let `opsz` do the work — optical sizing is why a 34px page title
// and a 13px card title look like the same voice instead of the same file
// scaled. This is the one thing that stops every heading in the app reading
// as default-Inter-semibold-tracking-tight.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  preload: true,
});

// UI/body face. Replaces Inter, which is legible but is also the single most
// recognisable "generated interface" signal there is. Instrument Sans is a
// slightly narrow grotesque — holds up at the 10–13px label sizes this app
// leans on, and has enough of its own character to sit under Fraunces
// without the pair looking accidental.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  axes: ["wdth"],
  preload: true,
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  variable: "--font-telugu",
  display: "swap",
  weight: ["500", "600", "700"],
  preload: true,
});

export const metadata: Metadata = {
  title: EVENT_NAME,
  description: `The official mobile app for the ${EVENT_NAME} — ${EVENT_TAGLINE}.`,
  applicationName: EVENT_APP_NAME,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: EVENT_APP_NAME,
  },
  formatDetection: { telephone: false },
  // No `icons` block on purpose: an explicit one overrides Next's file
  // convention, and these previously pointed at the PWA tile. app/icon.png and
  // app/apple-icon.png (the PAN IIT mark) are picked up automatically and are
  // what the browser tab should show. The summit hexagon stays the installed
  // app icon via manifest.json.
};

export const viewport: Viewport = {
  themeColor: "#1B1464",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${fraunces.variable} ${notoTelugu.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .catch(function (err) { console.warn('SW registration failed', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
