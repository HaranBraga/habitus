import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { startOfDay, endOfDay, resolveLoggedAt } from '../utils/date'

export async function waterRoutes(app: FastifyInstance) {
  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({ amountMl: z.number().min(50).max(2000), loggedAt: z.string().optional() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const loggedAt = resolveLoggedAt(parsed.data.loggedAt)
    if (!loggedAt) return reply.status(400).send({ error: 'Data inválida ou no futuro' })

    const log = await prisma.waterLog.create({
      data: { userId, amountMl: parsed.data.amountMl, loggedAt },
    })
    return reply.status(201).send(log)
  })

  app.get('/:userId/today', async (req) => {
    const { userId } = req.params as { userId: string }
    const now = new Date()
    const logs = await prisma.waterLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      orderBy: { loggedAt: 'asc' },
    })
    const total = logs.reduce((sum, l) => sum + l.amountMl, 0)
    return { logs, total }
  })

  app.get('/:userId/history', async (req) => {
    const { userId } = req.params as { userId: string }
    const logs = await prisma.waterLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      take: 30,
    })
    return logs
  })

  app.delete('/:logId', async (req, reply) => {
    const { logId } = req.params as { logId: string }
    await prisma.waterLog.delete({ where: { id: logId } })
    return reply.status(204).send()
  })
}
