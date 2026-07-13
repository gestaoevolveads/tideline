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

/* ── Alerta Sniper: a notificação chegando ────────────────────────────────
   O push chega aqui mesmo com o app fechado. É isso que faz o Sniper existir:
   não adianta avisar dentro do app se a pessoa só abre o app quando já perdeu
   a maré. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.titulo || 'Tideline', {
    body: d.corpo || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.praia || 'tideline',       // um aviso por praia, o novo substitui o velho
    renotify: true,
    data: { url: d.url || '/app.html' },
  }));
});

/* Tocar na notificação leva pro app. Se ele já estiver aberto numa aba, foca
   nela em vez de abrir outra. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || '/app.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/app') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(destino);
    })
  );
});
