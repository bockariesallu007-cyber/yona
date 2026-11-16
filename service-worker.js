
const CACHE_NAME = "yona-shell-v1";

const APP_FILES = [
  "/yona/",
  "/yona/index.html",
  "/yona/app.html",
  "/yona/member-view.html",
  "/yona/member.html",
  "/yona/member-admin.html",
  "/yona/member-portal.html",
  "/yona/manifest.json",
  "/yona/public-manifest.json",
  "/yona/styles.css",
  "/yona/yona-logo.jpg",
  "/yona/yona-public-icon.png",
  "/yona/app-icon.jpeg"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith("yona-shell-") &&
                           key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache Supabase data or authentication requests.
  if (
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/") ||
    url.pathname.includes("/storage/v1/") ||
    url.pathname.includes("/functions/v1/")
  ) return;

  // Do not intercept external websites or services.
  if (url.origin !== self.location.origin) return;

  // Pages: network first, saved page if offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ||
            await caches.match("/yona/app.html") ||
            await caches.match("/yona/index.html");
        })
    );
    return;
  }

  // Local application files: cache first.
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
  );
});
