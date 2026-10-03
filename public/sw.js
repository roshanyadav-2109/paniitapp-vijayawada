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
 * v2 cached static files only, and never stood between the app and a page.
 *
 * v3 keeps v2's rule while there is a network: every page still comes from
 * the server. What changes is what happens without one. The venue has no
 * Wi-Fi and the hall has almost no mobile signal, so each page the server
 * does send is also kept, and when the network fails — or takes longer than
 * PAGE_TIMEOUT_MS, which on one bar of signal is the same thing — the kept
 * copy is shown instead of the browser's offline error. The copy is marked
 * (see markOffline) so the page can say it is a saved one.
 *
 * Kept copies are exact pages for exact paths, never a stand-in for another
 * path, and the router's own payloads are still never cached: when one
 * cannot be fetched, Next falls back to a full page load, which lands here.
 *
 * "warm" (sent by components/features/offline-warmup.tsx while there is
 * signal) fetches the main screens ahead of time, every session and stall
 * page linked from them, and the scripts and styles they need.
 */
const CACHE_VERSION = "paniit-v3";
const CACHE_NAME = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const PRECACHE_URLS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];
const PAGE_TIMEOUT_MS = 6000;
// After a failure, the next pages wait only this long before the kept copy:
// the network that just failed is not about to recover.
const PAGE_TIMEOUT_AFTER_FAILURE_MS = 1500;
const ROUTER_TIMEOUT_MS = 5000;
let lastFailureAt = 0;
const recentlyFailed = () => Date.now() - lastFailureAt < 30000;

// Never kept, never answered from a copy.
const NO_STORE_PATHS = ["/admin", "/onboarding", "/api", "/auth", "/login", "/moderate"];

// Files that are replaced by writing a new name, never edited in place.
const STATIC_PREFIXES = [
  "/_next/static/",
  "/_next/image",
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
  "/map/",
  "/kp/",
  "/hero/",
  "/home/",
  "/highlights/",
  "/exhibitors/",
  "/pavilions/",
  "/media/",
  "/splash/",
];

// Followed from the warmed pages: every session, stall and speaker.
const WARM_LINK_PATTERN = /href="(\/(?:agenda|exhibitors|speakers)\/[A-Za-z0-9_-]+)"/g;
// Scripts and styles a page needs: the <script>/<link> tags carry
// "/_next/static/...", the router payload inlined beside them carries
// "static/chunks/..." for the rest. Paths contain "(authed)" and "[id]", so
// only quotes, whitespace, backslashes and angle brackets end one.
const ASSET_PATTERN = /(?:\/_next\/)?static\/(?:chunks|css|media)\/[^"'\s\\<>]+/g;

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
      // Drops every older version wholesale.
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticPath(url) {
  // "/exhibitors/<id>" is a page; "/exhibitors/logo.webp" is a file.
  if (url.pathname.startsWith("/_next/")) return STATIC_PREFIXES.some((p) => url.pathname.startsWith(p));
  return /\.[a-z0-9]{2,5}$/i.test(url.pathname) && STATIC_PREFIXES.some((p) => url.pathname.startsWith(p));
}

function isStorablePage(pathname) {
  return !NO_STORE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// One copy per path: "/agenda?tab=2" and "/agenda" are the same screen.
function pageKey(url) {
  return new URL(url.pathname, self.location.origin).toString();
}

// Tags a kept page so components/features/offline-banner.tsx can tell.
async function markOffline(response) {
  const html = await response.text();
  const savedAt = response.headers.get("x-saved-at") || "";
  const marked = html.replace("<head>", `<head><meta name="x-offline-copy" content="${savedAt}">`);
  return new Response(marked, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function storePage(key, response) {
  if (!response || !response.ok || response.redirected) return null;
  if (!(response.headers.get("content-type") || "").includes("text/html")) return null;
  const body = await response.text();
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" });
  headers.set("x-saved-at", new Date().toISOString());
  const cache = await caches.open(PAGES_CACHE);
  await cache.put(key, new Response(body, { status: 200, headers }));
  return body;
}

async function cacheAssets(html) {
  const urls = new Set(
    (html.match(ASSET_PATTERN) || []).map((u) => (u.startsWith("/_next/") ? u : `/_next/${u}`))
  );
  if (!urls.size) return;
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    [...urls].map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const r = await fetch(u);
        if (r.ok) await cache.put(u, r);
      } catch {
        /* next time */
      }
    })
  );
}

const offlinePage = () =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f6f5fb;color:#0d0930;text-align:center;padding:24px">
<div><p style="font-size:18px;font-weight:600;margin:0 0 8px">No signal, and this screen isn't saved yet</p>
<p style="margin:0 0 20px;color:#555">The agenda, speakers, expo and venue map work offline once the app has been opened with signal.</p>
<a href="/home" style="display:inline-block;background:#1B1464;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Go to Home</a></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

async function handleNavigation(event, url) {
  const key = pageKey(url);
  const storable = isStorablePage(url.pathname);
  const network = fetch(event.request);
  if (!storable) return network;

  // The fetch keeps going after a timeout, so a slow page still refreshes
  // the copy for next time.
  event.waitUntil(
    network.then((r) => storePage(key, r.clone())).catch(() => undefined)
  );

  const wait = recentlyFailed() ? PAGE_TIMEOUT_AFTER_FAILURE_MS : PAGE_TIMEOUT_MS;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), wait));
  const first = await Promise.race([network.catch(() => null), timeout]);
  if (first) return first;
  lastFailureAt = Date.now();

  const kept = await caches.open(PAGES_CACHE).then((c) => c.match(key));
  if (kept) return markOffline(kept);
  // Nothing kept: still give the network its chance before saying so.
  return network.catch(() => offlinePage());
}

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
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(event, url));
    return;
  }

  // The router's own payloads go straight to the network, every time, and
  // are never kept. On one bar of signal a tap would otherwise hang with no
  // end, so a payload that has not arrived in ROUTER_TIMEOUT_MS fails; Next
  // then loads the page in full, which handleNavigation answers.
  if (url.searchParams.has("_rsc") || req.headers.get("RSC") === "1") {
    event.respondWith(
      Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ROUTER_TIMEOUT_MS)),
      ]).catch(() => {
        // A background prefetch failing says less about the network than a tap.
        if (!req.headers.get("Next-Router-Prefetch")) lastFailureAt = Date.now();
        return Response.error();
      })
    );
    return;
  }

  if (!isStaticPath(url)) return;

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

async function warm(paths) {
  const seen = new Set();
  const queue = [...paths];
  while (queue.length) {
    const batch = queue.splice(0, 4);
    await Promise.all(
      batch.map(async (path) => {
        if (seen.has(path)) return;
        seen.add(path);
        try {
          const r = await fetch(path, { credentials: "same-origin", headers: { Accept: "text/html" } });
          const html = await storePage(pageKey(new URL(path, self.location.origin)), r);
          if (!html) return;
          await cacheAssets(html);
          // Only the top-level screens fan out, so this stays one level deep.
          if (paths.includes(path)) {
            for (const m of html.matchAll(WARM_LINK_PATTERN)) {
              if (!seen.has(m[1])) queue.push(m[1]);
            }
          }
        } catch {
          /* no signal; the next warm-up will try again */
        }
      })
    );
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "warm" && Array.isArray(data.paths)) {
    event.waitUntil(warm(data.paths));
  } else if (data.type === "forget-pages") {
    // Someone else signed in on this phone, or nobody is signed in now.
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
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
