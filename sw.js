const STATIC_CACHE = 'vac-static-v10';
const DYNAMIC_CACHE = 'vac-dynamic-v10';
const APP_VERSION = '2025-11-08-4';

const STATIC_ASSETS = [
  './',
  'index.html',
  'guia.html',
  'corredores.html',
  'styles.min.css?v=202511080230',
  'site.webmanifest',
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'images/VAC.png',
  'images/valley.jpg',
  'images/valley-1600.avif',
  'images/valley-2400.avif',
  'images/valley-3200.avif',
  'images/valley-1600.webp',
  'images/valley-2400.webp',
  'images/valley-3200.webp',
  'images/VAC-red.png',
  'images/VAC-altimetria-labeled.svg',
  'images/VAC-ruta-labeled.svg',
  'images/lgbtq_flag.svg',
  'data/sponsors.json',
  'route/vac.gpx',
  'gpu-io.min.js',
  'fluid-background.js',
  'VAC_Checklist_Autosuficiente.pdf',
  'VAC_Plantilla_Top_Tube.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(name => {
          const isCurrent = name === STATIC_CACHE || name === DYNAMIC_CACHE;
          const shouldDelete = (name.startsWith('vac-') && !isCurrent) || name.startsWith('vald-');
          return shouldDelete ? caches.delete(name) : Promise.resolve(false);
        })
      ))
      .then(() => self.clients.claim())
      .then(async () => {
        // Avisar a todas las pestañas controladas que hay versión nueva para recarga controlada
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(client => client.postMessage({ type: 'vac-update', version: APP_VERSION }));
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== location.origin) {
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === 'image' || request.url.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.url.endsWith('.css') || request.url.endsWith('.js')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    updateCache(request);
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Contenido no disponible offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

function updateCache(request) {
  fetch(request)
    .then(response => {
      if (!response || !response.ok) return;
      const copy = response.clone();
      caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
    })
    .catch(() => {
      // No-op when offline.
    });
}

// Responder a peticiones explícitas de verificación de versión desde las páginas
self.addEventListener('message', event => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'VAC_CHECK_VERSION') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        clients.forEach(client => client.postMessage({ type: 'vac-update', version: APP_VERSION }));
      });
  }
});
