// Neon Card Game - Service Worker (Caching optimized)
const CACHE_NAME = 'neoncard-v1.6.4';

// 核心資源清單 (移除 index.html，讓它總是檢查更新)
const CORE_ASSETS = [
    '/',
    '/manifest.json',
    '/css/styles.css',
    '/js/theme.js',
    '/logo/nenocard512512.png'
];

// 安裝階段：強制快取核心資源
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CORE_ASSETS);
        })
    );
});

// 啟動階段：清理舊版本快取
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 攔截請求策略
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 針對 圖片 (image)、腳本 (script)、樣式 (style) 採用「快取優先」策略
    // 這會讓圖片存在手機裡，下次開啟秒讀
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
    } else {
        // HTML 等動態內容採用「網路優先」，確保遊戲邏輯最新
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    }
});
