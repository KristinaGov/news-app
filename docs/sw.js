// Offline support: the app shell and the briefings you have opened are kept on the device.
const CACHE = "briefing-v3";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon-180.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only same-origin GETs are cached; GitHub API calls go straight to the network.
  // The version check ("?check=") must always reach the server and is never cached.
  if (event.request.method !== "GET" || url.origin !== location.origin || url.searchParams.has("check")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || Response.error()))
  );
});
