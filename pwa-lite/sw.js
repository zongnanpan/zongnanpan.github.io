// PWA Lite Service Worker
// 策略：核心资源 install 时预缓存（cache-first），其余请求 network-first + 写入缓存兜底离线
// 每次改动记得把版本号往上加一位，否则浏览器可能认为脚本没变，不会触发更新流程

const CACHE_VERSION = 'pwa-lite-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  console.log('[SW] install，预缓存核心资源');
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // 不调用 skipWaiting()：故意保留默认的"等所有旧页面关闭才切换"行为，
  // 用来验证 SW 更新流程本身的时序（这也是之前文档里提到的"缓存一致性事故"高发点）
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate，清理旧版本缓存');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 只处理 GET，其余请求原样放行
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((resp) => {
          // 拿到网络响应后写回缓存，下次离线也能用
          if (resp && resp.status === 200) {
            const respClone = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, respClone));
          }
          return resp;
        })
        .catch(() => cached); // 网络失败时兜底用缓存

      // 有缓存先返回缓存（快），同时后台去更新缓存；没缓存就等网络
      return cached || networkFetch;
    })
  );
});
