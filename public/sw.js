/* Service Worker — PWA 离线缓存 */
const CACHE = 'photowall-v2';
const ASSETS = [
  '/',
  '/css/style.css',
  '/js/api.js',
  '/js/app.js',
  '/js/components/navbar.js',
  '/js/components/home-page.js',
  '/js/components/photo-detail.js',
  '/js/components/upload-page.js',
  '/js/components/login-page.js',
  '/js/components/user-profile.js',
  '/js/components/settings-page.js',
  '/js/components/admin-page.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 跳过 API 和上传的图片
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
