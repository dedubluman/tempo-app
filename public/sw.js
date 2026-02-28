const CACHE_NAME = "fluxus-v1";
const APP_SHELL_CACHE = [
  "/app",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Fluxus Wallet - Offline</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0a0a0a; color: #f3f4f6; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { max-width: 420px; border: 1px solid #27272a; border-radius: 12px; padding: 24px; background: #111827; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0; color: #d1d5db; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>You are offline</h1>
        <p>Fluxus cannot reach the network right now. Reconnect to continue and submit queued transactions after confirmation.</p>
      </section>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/rpc")) {
    return;
  }

  const isNavigationRequest = request.mode === "navigate" || request.destination === "document";
  const isAppShellAsset =
    url.pathname === "/app" ||
    url.pathname.startsWith("/app/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/");

  if (!isNavigationRequest && !isAppShellAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const networkPromise = fetch(request)
        .then((response) => {
          if (response.ok && !url.pathname.startsWith("/api")) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          if (cached) {
            return cached;
          }

          if (isNavigationRequest) {
            return new Response(OFFLINE_FALLBACK_HTML, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
              status: 200,
            });
          }

          return new Response("Offline", { status: 503, statusText: "Offline" });
        });

      return cached || networkPromise;
    })
  );
});
