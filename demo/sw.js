/* Tideline — service worker mínimo e seguro.
   Network-first (sempre pega o mais novo; cai pro cache só offline).
   Só intercepta GET same-origin — não toca Supabase, Mercado Pago, Open-Meteo, esm.sh. */
const CACHE = 'tideline-v1';
const CORE = [
  '/app.html', '/tideline-data.js', '/tideline-templates.js', '/tideline-config.js',
  '/mascot.png', '/favicon.svg', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // não mexe em POST (Supabase/MP/checkout)
  if (new URL(req.url).origin !== location.origin) return; // só same-origin
  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req))
  );
});
