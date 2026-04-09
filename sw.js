const CACHE_NAME = "finanzapp-v4";
const BASE_PATH = new URL("./", self.location).pathname;
const toBasePath = (path) => new URL(path, self.location).pathname;
const OFFLINE_PAGE = toBasePath("src/pages/offline.html");

const APP_SHELL_FILES = [
  BASE_PATH,
  toBasePath("index.html"),
  toBasePath("manifest.json"),
  toBasePath("src/css/style.css"),
  toBasePath("src/css/offline.css"),
  toBasePath("src/js/app.js"),
  toBasePath("src/pages/offline.html"),
  toBasePath("src/img/icons/favicon.ico"),
  toBasePath("src/img/icons/favicon-16x16.png"),
  toBasePath("src/img/icons/favicon-32x32.png"),
  toBasePath("src/img/icons/favicon-48x48.png"),
  toBasePath("src/img/icons/favicon-64x64.png"),
  toBasePath("src/img/icons-ios/apple-touch-icon-120x120.png"),
  toBasePath("src/img/icons-ios/apple-touch-icon-152x152.png"),
  toBasePath("src/img/icons-ios/apple-touch-icon-167x167.png"),
  toBasePath("src/img/icons-ios/apple-touch-icon-180x180.png"),
  toBasePath("src/img/icons/icon-192.png"),
  toBasePath("src/img/icons/icon-512.png"),
  toBasePath("src/img/icons/icon-maskable-512.png"),
  toBasePath("src/img/finanzapp.png"),
];

// INSTALL guardar App Shell al instalar el SW
self.addEventListener("install", (event) => {
  const promesa = caches
    .open(CACHE_NAME)
    .then((cache) => {
      const shellPromises = APP_SHELL_FILES.map((url) =>
        cache
          .add(url)
          .catch((err) =>
            console.warn("[FZ SW] No se pudo cachear:", url, err),
          ),
      );
      return Promise.all(shellPromises);
    })
    .then(() => self.skipWaiting());
  event.waitUntil(promesa);
});

// ACTIVATE eliminar cachés obsoletos
self.addEventListener("activate", (event) => {
  const promesa = caches
    .keys()
    .then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        }),
      ),
    )
    .then(() => self.clients.claim());
  event.waitUntil(promesa);
});

// FETCH Network First + fallback caché + offline.html
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const respuesta = fetch(event.request)
    .then((response) => {
      if (response && response.ok) {
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, response.clone()));
      }
      return response;
    })
    .catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return caches
          .match(OFFLINE_PAGE)
          .then(
            (offlinePage) =>
              offlinePage ||
              new Response(
                "<h1>Sin conexión</h1><p>FinanZapp no está disponible.</p>",
                { headers: { "Content-Type": "text/html" } },
              ),
          );
      });
    });

  event.respondWith(respuesta);
});
