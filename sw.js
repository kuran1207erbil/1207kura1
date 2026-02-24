const CACHE_NAME = '1207-app-v12'; // وەشانی کاشەکەمان بەرزکردەوە
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
  // ئەم ستراتیجییە پێی دەوترێت "Stale-While-Revalidate"
  // واتا: "کۆنەکە بەکاربهێنە لەکاتێکدا نوێکە دادەبەزێنیت"
  // ئەمە وا دەکات ئەپەکە زۆر خێرا بێت و لە هەمان کاتدا داتاکانی نوێ بن.

  // تەنها داواکارییەکانی GET کاش دەکەین، بۆ ئەوەی داتاکانی سوپابەیسیش پاشەکەوت بکرێن
  if (event.request.method !== 'GET') {
    return; // با وەک خۆی کار بکات و کاش نەکرێت
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // لە هەمان کاتدا، داواکارییەک بۆ نێتۆرک دەنێرین بۆ هێنانی وەشانی نوێ
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // ئەگەر وەڵامێکی دروستمان وەرگرت، کاشەکە نوێ دەکەینەوە
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // وەشانی کاشکراو دەگەڕێنینەوە ئەگەر هەبوو (بۆ خێرایی)
        // ئەگەر نەبوو، چاوەڕێی وەڵامی نێتۆرکەکە دەکەین
        return cachedResponse || fetchPromise;
      });
    })
  );
});
