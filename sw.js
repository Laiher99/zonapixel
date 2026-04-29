// sw.js - Cachea archivos estáticos para offline

const CACHE_NAME = 'zp-videos-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/marketplace.html',
    '/videos.html',
    '/styles.css',
    '/marketplace.css',
    '/videos.css',
    '/script.js',
    '/marketplace.js',
    '/videos.js',
    '/db.js',
    '/img/logopequeño.png'
    // Agrega otras imágenes o fuentes si es necesario
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});