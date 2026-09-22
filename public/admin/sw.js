/* Only a public, data-free offline document is stored. Never cache admin/API responses. */
const CACHE_PREFIX = 'salt-ordo-admin-offline-'
const CACHE_NAME = `${CACHE_PREFIX}v1`
const OFFLINE_URL = '/admin-pwa/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(OFFLINE_URL, { cache: 'reload', credentials: 'omit' })
    if (!response.ok || response.redirected) throw new Error('Offline document unavailable')
    const cache = await caches.open(CACHE_NAME)
    await cache.put(OFFLINE_URL, response)
  })())
  // Updates wait until existing app windows close. Never reload an unsaved form.
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || !url.pathname.startsWith('/admin/')) return
  event.respondWith((async () => {
    try {
      return await fetch(request, { cache: 'no-store' })
    } catch {
      const cache = await caches.open(CACHE_NAME)
      return (await cache.match(OFFLINE_URL)) || new Response('Нет подключения. Подключитесь к интернету и откройте Salt Ordo Admin снова.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }
  })())
})
