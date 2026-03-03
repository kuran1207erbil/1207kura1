const CACHE_NAME = '1207-app-v7.8'; // وەشانی کاشەکەمان بەرزکردەوە بۆ زامنکردنی نوێبوونەوە
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
  'farmanbar/profile.html',
  'farmanbar/profile.css',
  'molat/molat.html',
  'molat/molat.css',
  'molat/molat.js',
  'molat/nwsraw.html',
  'molat/nwsraw.js', // ڕاستکردنەوەی ناونیشانی فایل بۆ شوێنی دروست
  'molat/pswla.html',
  'molat/pswla.js',
  'molat/pewist.html',
  'molat/pewist.js',
  'molat/karasta.html',
  'molat/karasta.js',
  'molat/report.html',
  'molat/report.js',
  'settings.html',
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
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // ستراتیجی "Network First": سەرەتا هەوڵی هێنانی لە نێتۆرک دەدات
    fetch(event.request).then(networkResponse => {
      // ئەگەر سەرکەوتوو بوو، کاشەکە نوێ دەکەینەوە و وەڵامەکە دەگەڕێنینەوە
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseToCache);
      });
      return networkResponse;
    }).catch(() => {
      // ئەگەر نێتۆرک شکستی هێنا (بۆ نموونە ئۆفلاین بوو)، هەوڵدەدات لە کاش بیهێنێت
      return caches.match(event.request);
    })
  );
});
