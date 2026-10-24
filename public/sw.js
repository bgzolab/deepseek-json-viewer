const CACHE_NAME = 'deepseek-json-viewer-shell-v1'
const INDEX_URL = new URL('index.html', self.registration.scope).toString()
const ROOT_URL = self.registration.scope

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)

  const indexResponse = await fetch(INDEX_URL, { cache: 'no-cache' })
  if (!indexResponse.ok) throw new Error('Unable to fetch index.html')

  await cache.put(INDEX_URL, indexResponse.clone())
  const html = await indexResponse.text()

  const assetUrls = new Set()
  const attributePattern = /(?:src|href)="([^"]+)"/g
  let match = attributePattern.exec(html)

  while (match) {
    const value = match[1]
    if (value && !value.startsWith('data:') && !value.startsWith('http')) {
      try {
        const url = new URL(value, self.registration.scope)
        if (url.origin === self.location.origin) assetUrls.add(url.toString())
      } catch {
        // Ignore malformed asset URLs in the shell.
      }
    }
    match = attributePattern.exec(html)
  }

  assetUrls.add(INDEX_URL)
  assetUrls.add(ROOT_URL)

  await Promise.all(
    [...assetUrls].map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' })
        if (response.ok) await cache.put(url, response)
      } catch {
        // A single optional asset should not block the service worker install.
      }
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAppShell()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match(INDEX_URL)) ||
            (await caches.match(ROOT_URL)) ||
            Response.error()
          )
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => Response.error())
    }),
  )
})
