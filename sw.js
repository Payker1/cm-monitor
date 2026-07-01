// sw.js — 방치형 돈복사 PWA 서비스워커
// 핵심: index.html·state.json 등은 항상 네트워크 우선(network-first).
// 캐시 때문에 옛 화면이 뜨는 문제 방지. 오프라인일 때만 캐시 폴백.

const CACHE = 'cm-v4';               // 버전 올리면 옛 캐시 자동 폐기
const ASSETS = ['manifest.json'];    // 최소 자산만 사전 캐시

// 설치: 즉시 활성화
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

// 활성화: 옛 버전 캐시 삭제 + 즉시 제어
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// fetch: network-first (항상 최신 시도 → 실패 시 캐시)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        // 성공하면 캐시에도 최신본 저장(오프라인 대비)
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req)) // 네트워크 실패 시에만 캐시
  );
});
