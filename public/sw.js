// 2막이음 서비스워커 — 오프라인 기본 캐시
const CACHE = '2makeum-v1';
const PRECACHE = [
  '/',
  '/css/common.css',
  '/js/common.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API·POST 요청은 캐시 안 씀
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 정적 자산(css/js/이미지)만 캐시 업데이트
        if (res.ok && (e.request.url.includes('/css/') || e.request.url.includes('/js/') || e.request.url.includes('/icons/'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
