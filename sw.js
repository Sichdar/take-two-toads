// Offline support. Prototype policy: try the network first (so fixes show up straight away),
// fall back to the saved copy when there is no signal. Bump CACHE on every release.
const CACHE = 'take-two-toads-v0.1.2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/book.css',
  'ui/app.js', 'ui/art/ink.js', 'ui/art/plants.js', 'ui/art/scenes.js',
  'logic/brew.js', 'logic/playtest.js', 'logic/customers.js', 'logic/herbal.js', 'logic/quality.js', 'logic/rng.js', 'logic/save.js', 'logic/state.js', 'logic/tutorial.js',
  'data/ailments.js', 'data/balance.js', 'data/ingredients.js', 'data/villagers.js', 'data/tutorial.js',
  'lang/en.js', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
