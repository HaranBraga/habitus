import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { getVapidPublicKey } from '../services/webpush'

export async function pushRoutes(app: FastifyInstance) {
  app.get('/vapid-public-key', async () => {
    const key = getVapidPublicKey()
    return { key, enabled: !!key }
  })

  app.post('/subscribe/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({
      endpoint: z.string().url(),
      keys: z.object({ p256dh: z.string(), auth: z.string() }),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { endpoint, keys } = parsed.data
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    })
    return reply.status(201).send({ ok: true })
  })

  app.delete('/subscribe/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const { endpoint } = req.body as { endpoint?: string }
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } })
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId } })
    }
    return reply.status(204).send()
  })
}
