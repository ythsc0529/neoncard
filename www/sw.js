// Neon Card Game - Service Worker (v1.8.0)
// ⚠️ 每次發布新版本時，務必同步更新此版本號以清空舊快取
const CACHE_NAME = 'neoncard-v1.8.3';

// 核心靜態資源（不含 HTML 頁面，HTML 永遠走 network-first）
const CORE_ASSETS = [
    '/manifest.json',
    '/css/styles.css',
    '/js/theme.js',
    '/logo/nenocard512512.png'
];

// 安裝階段：快取核心靜態資源，立即接管
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CORE_ASSETS);
        }).catch(err => {
            console.warn('[SW] Core asset cache failed:', err);
        })
    );
});

// 啟動階段：清除所有舊版本快取，立即接管所有分頁
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 攔截請求策略
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ── 規則 1：外部請求（Firebase、GitHub、CDN 等）完全不攔截 ──
    if (url.origin !== self.location.origin) {
        return; // 讓瀏覽器正常處理，不做任何快取
    }

    // ── 規則 2：HTML 頁面永遠走 Network-First ──
    // 確保每次都取得最新版本的 index.html、game.html 等
    if (event.request.destination === 'document' ||
        url.pathname === '/' ||
        url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // ── 規則 3：靜態資源（圖片、字型、腳本、樣式）走 Cache-First ──
    const isStaticAsset =
        event.request.destination === 'image' ||
        event.request.destination === 'font' ||
        event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        url.pathname.includes('/pic/') ||
        url.pathname.includes('/hao_pic/') ||
        url.pathname.includes('/item_pic/') ||
        url.pathname.includes('/race_pic/');

    if (isStaticAsset) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;

                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200) return networkResponse;

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                });
            })
        );
        return;
    }

    // ── 規則 4：其餘請求走 Network-First ──
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
