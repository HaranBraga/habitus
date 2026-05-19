import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'

export async function weightRoutes(app: FastifyInstance) {
  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({ weight: z.number().min(20).max(300) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const log = await prisma.weightLog.create({
      data: { userId, weight: parsed.data.weight },
    })
    return reply.status(201).send(log)
  })

  app.get('/:userId/latest', async (req) => {
    const { userId } = req.params as { userId: string }
    const log = await prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
    })
    return log
  })

  app.get('/:userId/history', async (req) => {
    const { userId } = req.params as { userId: string }
    const logs = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      take: 30,
    })
    return logs
  })

  app.get('/:userId/due', async (req) => {
    const { userId } = req.params as { userId: string }
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    const intervalDays = settings?.weightCheckIntervalDays ?? 7

    const latest = await prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
    })

    if (!latest) return { due: true, daysAgo: null }

    const daysAgo = Math.floor(
      (Date.now() - latest.loggedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    return { due: daysAgo >= intervalDays, daysAgo, lastWeight: latest.weight }
  })
}
