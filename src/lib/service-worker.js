// Offline caching for the course. Compiled by Next.js into
// /_next/static/service-worker/ and registered with scope "/" (see
// ServiceWorkerRegistrar). Course content is fully static, so every page can
// be precached and served when the network is gone; /api/* (progress sync)
// is deliberately never intercepted.

const VERSION = "v1";
const PAGE_CACHE = `pages-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const RSC_CACHE = `rsc-${VERSION}`;

// One warm pass per hour is enough to pick up new deploys without
// re-downloading the whole course on every reload.
const WARM_INTERVAL_MS = 60 * 60 * 1000;
const WARM_MARKER = "/__warmed-at";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGE_CACHE, ASSET_CACHE, RSC_CACHE];
      for (const key of await caches.keys()) {
        if (!keep.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "CACHE_PAGES" && Array.isArray(data.urls)) {
    event.waitUntil(warmPages(data.urls));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, PAGE_CACHE));
    return;
  }
  // Router payloads for soft navigations/prefetches. Server Actions are
  // POSTs and the offline HEAD probes are HEADs, so neither reaches here.
  if (req.headers.get("RSC") === "1") {
    event.respondWith(networkFirst(req, RSC_CACHE));
    return;
  }
  if (/\.(svg|ico|png|jpe?g|webp|gif|woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
  }
});

/** Cache key for a page: path only, so prefetch cache-busters don't fragment it. */
function pageKey(url) {
  const u = new URL(url, self.location.origin);
  return u.origin + u.pathname;
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreVary: true });
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const key = pageKey(req.url);
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(key, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(key, { ignoreVary: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      // Last resort: the home shell beats a browser error page.
      const home = await cache.match(pageKey("/"), { ignoreVary: true });
      if (home) return home;
    }
    throw err;
  }
}

async function warmPages(urls) {
  const pageCache = await caches.open(PAGE_CACHE);

  const marker = await pageCache.match(WARM_MARKER);
  if (marker) {
    const at = Number(await marker.text());
    if (Date.now() - at < WARM_INTERVAL_MS) return;
  }

  const rscCache = await caches.open(RSC_CACHE);
  await Promise.allSettled(
    urls.map(async (url) => {
      const key = pageKey(url);
      const res = await fetch(url);
      if (res.ok) {
        await pageCache.put(key, res.clone());
        await cacheAssetsFromHtml(await res.text());
      }
      // Also warm the router payload so soft navigation to never-visited
      // pages works after an offline reload.
      const rscRes = await fetch(url, { headers: { RSC: "1" } });
      if (rscRes.ok) await rscCache.put(key, rscRes);
    }),
  );

  await pageCache.put(WARM_MARKER, new Response(String(Date.now())));
}

/** Cache every build asset a page's HTML references (scripts, CSS, fonts). */
async function cacheAssetsFromHtml(html) {
  const found = new Set();
  // Plain references in tags/preloads, and url(...) inside inline CSS.
  for (const m of html.match(/\/_next\/static\/[^"'\\\s<>)]+/g) ?? []) {
    found.add(m);
  }
  // References inside the serialized RSC payload ("static/chunks/…",
  // possibly behind escaped quotes).
  for (const m of html.match(/static\/(?:chunks|css|media)\/[^"'\\\s<>)]+/g) ??
    []) {
    found.add(`/_next/${m}`);
  }

  const cache = await caches.open(ASSET_CACHE);
  await Promise.allSettled(
    [...found].map(async (assetUrl) => {
      if (await cache.match(assetUrl)) return;
      const res = await fetch(assetUrl);
      if (!res.ok) return;
      await cache.put(assetUrl, res.clone());
      // CSS pulls in fonts (Geist, KaTeX) via url(...); cache those too.
      if (assetUrl.endsWith(".css")) {
        const css = await res.text();
        await Promise.allSettled(
          (css.match(/\/_next\/static\/media\/[^"'\s)]+/g) ?? []).map(
            async (fontUrl) => {
              if (await cache.match(fontUrl)) return;
              const fontRes = await fetch(fontUrl);
              if (fontRes.ok) await cache.put(fontUrl, fontRes);
            },
          ),
        );
      }
    }),
  );
}
