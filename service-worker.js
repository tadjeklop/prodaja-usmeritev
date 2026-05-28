// Service worker — network-first strategija (popravljeno zaradi i18n stale cache problem).
// Bump verzije ob vsaki pomembnejši spremembi JS/JSON datotek.

const CACHE_NAME = 'interzero-epr-v16';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('SW: deleting old cache', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Samo same-origin
  if (url.origin !== location.origin) return;

  // NETWORK-FIRST za VSE — sveže datoteke vedno. Cache je samo offline fallback.
  e.respondWith(
    fetch(e.request).then(res => {
      // Shrani v cache, samo za uspešne odgovore
      if (res.ok && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

// Sporoči klientom, da je nova verzija aktivna
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
