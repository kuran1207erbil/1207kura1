const CACHE_NAME = '1207-app-v8'; // وەشانی کاشەکەمان بەرزکردەوە
const urlsToCache = [
  './',
  'home.html',
  'style.css',
  'script.js',
  'translations.js',
  'assests/icon.png',
  // زیادکردنی لاپەڕە و فایلە گرنگەکانی تر
  'farmanbar/farmanbar.html',
  'farmanbar/farmanbar.css',
  'molat/molat.html',
  'molat/molat.css',
  'molat/molat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' // زیادکردنی فۆنتەکان بۆ ئۆفلاین
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// زیادکردنی ئەم بەشە بۆ سڕینەوەی کاشی کۆن
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // گەڕان بەدوای هەموو کاشە کۆنەکان و سڕینەوەیان
          return cacheName.startsWith('1207-app-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
