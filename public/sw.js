const CACHE_NAME = 'deepseek-json-viewer-shell-v6'
const INDEX_URL = new URL('index.html', self.registration.scope).toString()
const ROOT_URL = self.registration.scope

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const cachedUrls = new Set()

  const indexResponse = await fetch(INDEX_URL, { cache: 'no-cache' })
  if (!indexResponse.ok) throw new Error('Unable to fetch index.html')

  await cache.put(INDEX_URL, indexResponse.clone())
  cachedUrls.add(INDEX_URL)
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
  assetUrls.add(new URL('images/avatar.webp', self.registration.scope).toString())
  assetUrls.add(new URL('images/brand-hero.webp', self.registration.scope).toString())

  // Vite references the worker chunk from the app bundle, not from index.html. Scan the
  // JavaScript shell so a cold offline reload can still parse imports in the worker.
  const workerPattern = /(?:[A-Za-z0-9_./-]*\/)?import\.worker-[A-Za-z0-9_-]+\.js/g
  const jsUrls = [...assetUrls].filter((url) => new URL(url).pathname.endsWith('.js'))
  for (const jsUrl of jsUrls) {
    const response = await fetch(jsUrl, { cache: 'reload' })
    if (!response.ok) {
      throw new Error(`Unable to inspect ${jsUrl}: ${response.status}`)
    }
    await cache.put(jsUrl, response.clone())
    cachedUrls.add(jsUrl)
    const source = await response.text()
    const matches = source.match(workerPattern) ?? []
    for (const match of matches) {
      const workerUrl = new URL(match, jsUrl)
      if (workerUrl.origin === self.location.origin) {
        assetUrls.add(workerUrl.toString())
      }
    }
  }

  await Promise.all(
    [...assetUrls].map(async (url) => {
      if (cachedUrls.has(url)) return
      const response = await fetch(url, { cache: 'reload' })
      if (!response.ok) {
        throw new Error(`Unable to precache ${url}: ${response.status}`)
      }
      await cache.put(url, response)
    }),
  )
}

self.addEventListener('install', (event) => {
  // A failed precache must not activate a partial cache and delete the last good one.
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()))
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
