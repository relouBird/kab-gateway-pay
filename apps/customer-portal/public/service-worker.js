const CACHE_NAME = "kgpay-customer-portal-shell-v1";
const APP_SCOPE = new URL(self.registration.scope);
const APP_SHELL_URL = APP_SCOPE.href;
const STATIC_PATHS = [
  new URL("assets/", APP_SCOPE).pathname,
  new URL("brand/", APP_SCOPE).pathname,
  new URL("favicon.svg", APP_SCOPE).pathname,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch(APP_SHELL_URL);
      if (!response.ok)
        throw new Error("Could not cache the customer app shell.");
      const html = await response.clone().text();
      const assets = Array.from(
        html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g),
        (match) => new URL(match[1], APP_SCOPE).href,
      )
        .map((asset) => new URL(asset, APP_SCOPE).href)
        .filter((asset) => new URL(asset).origin === APP_SCOPE.origin);
      assets.push(
        new URL("brand/kgpay-logotype-clair.svg", APP_SCOPE).href,
        new URL("brand/kgpay-logotype-sombre.svg", APP_SCOPE).href,
        new URL("favicon.svg", APP_SCOPE).href,
      );
      const cache = await caches.open(CACHE_NAME);
      await cache.put(APP_SHELL_URL, response);
      await cache.addAll(assets);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("kgpay-customer-portal-shell-") &&
                key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== APP_SCOPE.origin) return;

  if (
    request.mode === "navigate" &&
    url.pathname.startsWith(APP_SCOPE.pathname)
  ) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(APP_SHELL_URL, response.clone());
            } catch (error) {
              console.warn(
                "Could not update the customer app shell cache.",
                error,
              );
            }
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedShell = await cache.match(APP_SHELL_URL);
          return (
            cachedShell ??
            new Response("KG Pay is offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  if (
    STATIC_PATHS.some((path) => url.pathname.startsWith(path)) &&
    url.pathname.startsWith(APP_SCOPE.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedAsset = await cache.match(request, { ignoreVary: true });
        if (cachedAsset) return cachedAsset;

        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
