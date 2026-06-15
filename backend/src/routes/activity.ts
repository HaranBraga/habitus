import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { startOfDay, endOfDay } from '../utils/date'

export async function activityRoutes(app: FastifyInstance) {
  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({
      durationMinutes: z.number().min(1).max(480),
      description: z.string().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const log = await prisma.activityLog.create({
      data: { userId, ...parsed.data, loggedAt: new Date() },
    })
    return reply.status(201).send(log)
  })

  app.get('/:userId/today', async (req) => {
    const { userId } = req.params as { userId: string }
    const now = new Date()
    const logs = await prisma.activityLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    })
    const total = logs.reduce((sum, l) => sum + l.durationMinutes, 0)
    return { logs, total }
  })

  app.get('/:userId/history', async (req) => {
    const { userId } = req.params as { userId: string }
    const logs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      take: 30,
    })
    return logs
  })
}
