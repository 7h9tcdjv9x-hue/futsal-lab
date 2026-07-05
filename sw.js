const CACHE = 'futsal-lab-v3';
const ASSET = ['.', 'index.html', 'css/style.css', 'manifest.json',
  'js/app.js', 'js/util.js', 'js/storage.js', 'js/programma.js', 'js/piani.js',
  'js/oggi.js', 'js/seduta.js', 'js/pianiView.js', 'js/calcoli.js', 'js/grafici.js',
  'js/progressi.js', 'js/whoop.js', 'js/foto.js', 'js/dieta.js', 'js/impostazioni.js',
  'js/icone.js', 'js/ui.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSET)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {}); } return r; }).catch(() => caches.match(e.request)));
});
