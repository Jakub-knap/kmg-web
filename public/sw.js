// KMG stav – service worker pre aplikáciu správy webu.
// Stránky a súbory berie vždy najprv z internetu, bez pripojenia použije poslednú uloženú kópiu.
// API (fotky, ponuky, prihlásenie) sa nikdy neukladá.
const CACHE = 'kmg-v3';
const ZAKLAD = [
  '/admin',
  '/assets/css/site.css',
  '/assets/css/admin.css',
  '/assets/js/admin.js',
  '/assets/img/logo.png',
  '/assets/img/icon-192.png',
  '/assets/img/favicon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ZAKLAD)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((kluce) => Promise.all(kluce.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const kopia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopia));
        }
        return res;
      })
      .catch(async () => {
        const ulozene = await caches.match(req, { ignoreSearch: true });
        if (ulozene) return ulozene;
        if (req.mode === 'navigate') return caches.match('/admin');
        return Response.error();
      }),
  );
});
