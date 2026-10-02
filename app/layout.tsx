import type { Metadata, Viewport } from "next";
import { Lexend, Noto_Sans_Telugu } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { LaunchSplash } from "@/components/features/launch-splash";
import { EVENT_APP_NAME, EVENT_NAME, EVENT_TAGLINE } from "@/lib/event-config";
import "./globals.css";

/**
 * Lexend, used for both titles and body: built for easy reading, and the
 * face of quizspace.unknowniitians.com.
 *
 * A variable font, so one file carries every weight the app sets.
 *
 * Latin only. The greeting on the sign-in screen rotates through Devanagari,
 * Telugu, Tamil and Kannada; Noto Sans Telugu is loaded separately for
 * Telugu, and the rest fall back to the system's Indic faces.
 *
 * Bound to --font-sans, which --font-display follows, so the `font-display`
 * utility and every existing heading keep working untouched.
 */
const lexend = Lexend({
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
    // Android builds a launch screen from the manifest's icon and colour;
    // iOS does not, and without these an installed copy opens on a white
    // flash — the most web-page-looking moment in the whole app. One per
    // screen size Apple matches on, newest first.
    startupImage: [
      { url: "/splash/splash-1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/splash-1536x2048.png", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  formatDetection: { telephone: false },
  // Chrome's own version of the apple-mobile-web-app flag above. Next has no
  // field for it, and without it Android can decide to open an installed
  // copy in a browser tab with the address bar showing.
  other: { "mobile-web-app-capable": "yes" },
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
  // maximumScale/userScalable are gone. iOS has ignored them since 10, and
  // on Android they took pinch-zoom away from anyone who needs it — which
  // also meant a phone that landed zoomed in had no way back out.
  viewportFit: "cover",
  // The on-screen keyboard resizes the page instead of being laid over it,
  // so a composer pinned to the bottom of the screen stays above the keys
  // rather than behind them.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${notoTelugu.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {/* Chrome says the app can be installed (beforeinstallprompt) as
            early as it likes, often before the install button has loaded,
            and an event missed is gone: the sheet then fell back to "Add to
            Home screen", which on Android makes a Chrome shortcut, not the
            app. Held here from the first moment for the button to use. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event('paniit:installable'));});window.addEventListener('appinstalled',function(){window.__installPrompt=null;});`,
          }}
        />
        <LaunchSplash />
        {children}
        <Toaster />
        {/* Production only. In development Next serves its chunks at URLs
            that never change between edits, so a registered worker hands
            back yesterday's code from its cache and every change looks as
            if it did nothing. A worker left over from an earlier session is
            removed instead. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              process.env.NODE_ENV === "production"
                ? `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .catch(function (err) { console.warn('SW registration failed', err); });
                });
              }
            `
                : `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function (rs) {
                  rs.forEach(function (r) { r.unregister(); });
                });
                if (window.caches) {
                  caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
