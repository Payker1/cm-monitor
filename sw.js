// 방치형 돈복사 · service worker (PWA 토대)
// 현재는 설치/활성화만. 백그라운드 웹푸시(push 이벤트)는 별도 단계에서 추가 예정.
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

// 향후 웹푸시용 자리 (지금은 미사용):
// self.addEventListener('push', e => {
//   const d = e.data ? e.data.json() : {};
//   e.waitUntil(self.registration.showNotification(d.title||'방치형 돈복사', {body:d.body||''}));
// });
// self.addEventListener('notificationclick', e => {
//   e.notification.close();
//   e.waitUntil(self.clients.openWindow('./index.html'));
// });
