import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Habitus', body: '' }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Habitus', {
      body: data.body ?? '',
      icon: data.icon ?? '/icon.svg',
      badge: '/icon.svg',
      tag: 'habitus',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    (self.clients as Clients).matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); return }
      return (self.clients as Clients).openWindow(url)
    })
  )
})
