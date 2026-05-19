import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { startOfDay, endOfDay } from '../utils/date'

export async function englishRoutes(app: FastifyInstance) {
  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({
      studied: z.boolean().default(true),
      durationMinutes: z.number().min(1).max(480).optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const log = await prisma.englishLog.create({
      data: { userId, ...parsed.data },
    })
    return reply.status(201).send(log)
  })

  app.get('/:userId/today', async (req) => {
    const { userId } = req.params as { userId: string }
    const now = new Date()
    const log = await prisma.englishLog.findFirst({
      where: {
        userId,
        loggedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    })
    return { studied: !!log, log }
  })

  app.get('/:userId/history', async (req) => {
    const { userId } = req.params as { userId: string }
    const logs = await prisma.englishLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      take: 30,
    })
    return logs
  })
}
