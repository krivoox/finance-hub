/**
 * Finance Hub — selective Service Worker (SPEC-20).
 *
 * Cache-first ONLY for hashed Next static assets (`/_next/static/*`).
 * Never cache: HTML of (app), `/api/*`, or RSC money flights as offline SoT.
 * Navigation offline → precached `/offline` (honest UX, no stale balances).
 */
/* eslint-disable no-restricted-globals */

const VERSION = "fh-sw-v1";
const STATIC_CACHE = `${VERSION}-static`;
const SHELL_CACHE = `${VERSION}-shell`;

/** Precache only honest offline surfaces — never dashboards or money APIs. */
const PRECACHE_URLS = ["/offline"];

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"))
  );
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    void cache.put(request, response.clone());
  }
  return response;
}

async function networkOnlyWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const shell = await caches.open(SHELL_CACHE);
    const offline = await shell.match("/offline");
    if (offline) return offline;
    return new Response(
      "<!doctype html><title>Sin conexión</title><p>Sin conexión. Reintentá cuando vuelva la red.</p>",
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      await shell.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("fh-sw-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch APIs (auth, money, cron).
  if (isApiRequest(url)) return;

  // Cache-first for immutable hashed static chunks only.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // Document navigations: network only; on failure serve /offline.
  // Do NOT put (app) HTML or RSC payloads into Cache Storage as SoT.
  if (isNavigationRequest(request)) {
    event.respondWith(networkOnlyWithOfflineFallback(request));
  }
});
