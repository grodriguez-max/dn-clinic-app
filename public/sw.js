// DN Clínicas — Service Worker
const CACHE_NAME = "dn-clinicas-v1"
const OFFLINE_URL = "/offline"

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/offline",
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle GET requests
  if (request.method !== "GET") return

  // Skip Supabase API calls and auth routes — always network-first
  const url = new URL(request.url)
  if (url.hostname.includes("supabase") || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful navigation responses
        if (response.ok && request.mode === "navigate") {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // Serve from cache on network failure
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // For navigation, serve offline page
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL) ?? new Response("Sin conexión", { status: 503 })
          }
          return new Response("Sin conexión", { status: 503 })
        })
      })
  )
})
