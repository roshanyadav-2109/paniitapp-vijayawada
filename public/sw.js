/*
 * PAN IIT 2026 service worker.
 *
 * v1 cached every GET it saw — personalised pages, the React payloads the
 * client router fetches to move between screens, everything — and on any
 * network stumble answered with whatever it had, falling back to a cached
 * "/" for a navigation to some entirely different page. A stale navigation
 * payload is indistinguishable from a tap that did nothing, which is how
 * the QR badge came to "not open".
 *
 * v2 caches static files only, and never stands between the app and a page.
 */
const CACHE_VERSION = "paniit-v2";
const CACHE_NAME = `${CACHE_VERSION}-static`;
const PRECACHE_URLS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// Screens that belong to one person. Nothing here is ever stored.
const PRIVATE_PATHS = ["/me", "/chat", "/meetings", "/recap", "/scan", "/admin", "/onboarding", "/api"];

// Files that are replaced by writing a new name, never edited in place.
const STATIC_PREFIXES = [
  "/_next/static/",
  "/icons/",
  "/ui/",
  "/empty/",
  "/x/",
  "/legacy/",
  "/past-sponsors/",
  "/logo/",
  "/iits/",
  "/sectors/",
  "/audience/",
  "/press/",
  "/carousel/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // Drops v1 wholesale, and with it every page it should never have held.
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Someone else's server, the database, and dev tooling: not our business.
  if (url.origin !== self.location.origin) return;
  if (url.hostname.includes("supabase.co")) return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Page navigations and the router's own payloads go straight to the
  // network, every time. Serving either from a cache shows the app a screen
  // it did not ask for.
  if (req.mode === "navigate") return;
  if (url.searchParams.has("_rsc")) return;
  if (req.headers.get("RSC") === "1") return;

  // Anything personal, including the API.
  if (PRIVATE_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return;

  const isStatic = STATIC_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (!isStatic) return;

  // Cache-first, because these filenames are unique to their contents.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy).catch(() => undefined));
        }
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "PAN IIT 2026", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "PAN IIT 2026";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/home" },
    tag: data.tag || "paniit-default",
    renotify: false,
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
