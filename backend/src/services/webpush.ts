import webpush from 'web-push'
import { prisma } from '../server'

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const CONTACT = process.env.VAPID_CONTACT || 'mailto:admin@habitus.app'

let initialized = false

export function initWebPush() {
  if (PUBLIC_KEY && PRIVATE_KEY) {
    webpush.setVapidDetails(CONTACT, PUBLIC_KEY, PRIVATE_KEY)
    initialized = true
    console.log('Web Push inicializado')
  } else {
    console.log('VAPID keys não configuradas — push notifications desativadas')
  }
}

export function getVapidPublicKey(): string | null {
  return PUBLIC_KEY ?? null
}

export async function sendPushToUser(userId: string, title: string, body: string, url = '/') {
  if (!initialized) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url, icon: '/icon.svg', badge: '/icon.svg' })
      )
    } catch (err: unknown) {
      // Remove invalid subscriptions (410 Gone)
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410 || status === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null)
      }
    }
  }
}

export async function sendPushToAll(title: string, body: string, url = '/') {
  const users = await prisma.user.findMany({ select: { id: true } })
  await Promise.all(users.map(u => sendPushToUser(u.id, title, body, url)))
}
