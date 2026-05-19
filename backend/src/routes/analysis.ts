import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { analyzeUserProgress } from '../services/deepseek'

export async function analysisRoutes(app: FastifyInstance) {
  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const since7d = new Date(Date.now() - 7 * 86400000)
    const since30d = new Date(Date.now() - 30 * 86400000)

    const [weightHistory, waterLogs7d, actLogs7d, readLogs7d, engLogs7d] = await Promise.all([
      prisma.weightLog.findMany({
        where: { userId, loggedAt: { gte: since30d } },
        orderBy: { loggedAt: 'desc' },
        select: { weight: true, loggedAt: true },
      }),
      prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      prisma.englishLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
    ])

    const waterDays = new Set(waterLogs7d.map((l) => l.loggedAt.toISOString().slice(0, 10)))
    const waterAvg7d = waterDays.size > 0
      ? Math.round(waterLogs7d.reduce((s, l) => s + l.amountMl, 0) / waterDays.size)
      : 0

    const actDays = new Set(actLogs7d.map((l) => l.loggedAt.toISOString().slice(0, 10)))
    const actAvg7d = actDays.size > 0
      ? Math.round(actLogs7d.reduce((s, l) => s + l.durationMinutes, 0) / actDays.size)
      : 0

    const readDays = new Set(readLogs7d.map((l) => l.loggedAt.toISOString().slice(0, 10)))
    const readAvg7d = readDays.size > 0
      ? Math.round(readLogs7d.reduce((s, l) => s + l.durationMinutes, 0) / readDays.size)
      : 0

    const engDays7d = new Set(engLogs7d.map((l) => l.loggedAt.toISOString().slice(0, 10))).size

    const allWater = await prisma.waterLog.findMany({
      where: { userId }, orderBy: { loggedAt: 'desc' }, select: { loggedAt: true },
    })
    const days = new Set(allWater.map((l) => l.loggedAt.toISOString().slice(0, 10)))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (days.has(d.toISOString().slice(0, 10))) streak++
      else break
    }

    const analysis = await analyzeUserProgress({
      name: user.name,
      weightHistory: weightHistory.map((w) => ({
        weight: w.weight,
        loggedAt: w.loggedAt.toISOString(),
      })),
      waterAvg7d,
      waterGoal: user.settings?.waterGoalMl ?? 2000,
      activityAvg7d: actAvg7d,
      activityGoal: user.settings?.activityGoalMinutes ?? 30,
      readingAvg7d: readAvg7d,
      englishDays7d: engDays7d,
      streak,
      totalPoints: streak * 50,
    })

    return {
      analysis,
      data: {
        waterAvg7d,
        activityAvg7d: actAvg7d,
        readingAvg7d: readAvg7d,
        englishDays7d: engDays7d,
        weightHistory: weightHistory.slice(0, 10),
        streak,
      },
    }
  })
}
