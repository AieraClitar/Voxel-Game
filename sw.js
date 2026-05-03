const CACHE_NAME = 'voxel-sandbox-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './game/main.js',
  './game/world/World.js',
  './game/entities/Player.js',
  './game/ai/AIController.js',
  './game/utils/Textures.js',
  './game/utils/Noise.js',
  './game/utils/AudioSys.js'
];

// Install Event - Cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Fetch Event - Serve from cache if available
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Activate Event - Clean up old caches
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