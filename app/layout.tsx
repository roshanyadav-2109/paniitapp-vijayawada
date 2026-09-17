import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Noto_Sans_Telugu } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { EVENT_APP_NAME, EVENT_NAME, EVENT_TAGLINE } from "@/lib/event-config";
import "./globals.css";

// Display face for titles. This is the one thing that stops every heading in
// the app reading as default-Inter-semibold-tracking-tight.
//
// NO `axes` HERE, DELIBERATELY. Requesting extra variable axes (we had
// `["SOFT", "WONK", "opsz"]`) makes next/font fetch an axis-specific subset
// from Google at build time, and that request hangs indefinitely inside
// Vercel's build sandbox: the deployment sits at status UNKNOWN with a 0ms
// build and never fails, so there is no error to read. Verified by deploying
// the same commit twice, changing only this — with axes it hung for 18
// minutes, without them it went Ready in 2. It does NOT reproduce locally,
// even on a cold build with the font cache cleared, because the fonts are
// already on the machine.
//
// Cost of leaving them out: Fraunces falls back to its default instance,
// which is WONK 0 / SOFT 0 — very close to the intended setting anyway — and
// `font-optical-sizing` becomes a no-op, so a 30px masthead and a 13px card
// title no longer adjust their hairlines independently. If that optical
// sizing is wanted back, self-host the variable font with `next/font/local`;
// that keeps every axis and makes no network call during the build.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

// UI/body face. Replaces Inter, which is legible but is also the single most
// recognisable "generated interface" signal there is. Instrument Sans is a
// slightly narrow grotesque — holds up at the 10–13px label sizes this app
// leans on, and has enough of its own character to sit under Fraunces
// without the pair looking accidental.
// Same rule as above — no `axes`. The `wdth` axis was never actually used by
// any style in the app, so dropping it costs nothing at all.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
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
