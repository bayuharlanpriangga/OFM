// OFM Service Worker
// - App shell (same-origin): Network First, so users always get the latest
//   deploy while online, with cache as the offline fallback (unchanged from before).
// - Pinned third-party CDN assets (Tesseract.js OCR engine + its wasm/worker/
//   language-data files, Google Fonts): Cache First. These URLs are version-pinned
//   (e.g. tesseract.js@5), so a cached copy never goes stale — caching them
//   aggressively avoids re-downloading multi-MB files every load, and means
//   "Baca Struk" (receipt OCR) keeps working fully offline after the first read.
const CACHE = 'ofm-shell';
const CDN_CACHE = 'ofm-cdn-v1';

// NOTE: tessdata.projectnaptha.com is Tesseract.js's default language-data host —
// double check this against the Network tab in devtools if you ever bump the
// tesseract.js version, since the default CDN can change between releases.
const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'tessdata.projectnaptha.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

function isPinnedCdnAsset(url) {
  return CDN_HOSTS.includes(url.hostname);
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Pinned CDN assets: serve from cache instantly if we have it, only hit the
  // network on a cache miss (first use), then store the result for next time.
  if (isPinnedCdnAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CDN_CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // App shell: network-first, cache fallback (same behavior as before).
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached => cached || caches.match('./index.html'))
    )
  );
});
