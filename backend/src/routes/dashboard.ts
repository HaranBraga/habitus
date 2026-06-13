import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { startOfDay, endOfDay, toLocalDateStr } from '../utils/date'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const now = new Date()
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    const [waterLogs, activityLogs, readingLogs, englishLogs, latestWeight] = await Promise.all([
      prisma.waterLog.findMany({
        where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.activityLog.findMany({
        where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.readingLog.findMany({
        where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.englishLog.findMany({
        where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.weightLog.findFirst({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
      }),
    ])

    const settings = user.settings ?? {
      waterGoalMl: 2000,
      activityGoalMinutes: 30,
      readingGoalMinutes: 20,
      englishGoalMinutes: 15,
      weightCheckIntervalDays: 7,
    }

    const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0)
    const activityTotal = activityLogs.reduce((s, l) => s + l.durationMinutes, 0)
    const readingTotal = readingLogs.reduce((s, l) => s + l.durationMinutes, 0)
    const englishTotal = englishLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)

    const daysAgoWeight = latestWeight
      ? Math.floor((Date.now() - latestWeight.loggedAt.getTime()) / 86400000)
      : null
    const weightDue = daysAgoWeight === null || daysAgoWeight >= settings.weightCheckIntervalDays

    const streak = await calcStreak(userId)
    const points = calcPoints({
      waterTotal,
      waterGoal: settings.waterGoalMl,
      activityTotal,
      activityGoal: settings.activityGoalMinutes,
      readingTotal,
      readingGoal: settings.readingGoalMinutes,
      englishTotal,
      englishGoal: settings.englishGoalMinutes,
    })

    return {
      user: { id: user.id, name: user.name, height: user.height },
      settings,
      today: {
        water: { total: waterTotal, goal: settings.waterGoalMl, logs: waterLogs },
        activity: { total: activityTotal, goal: settings.activityGoalMinutes, logs: activityLogs },
        reading: { total: readingTotal, goal: settings.readingGoalMinutes, logs: readingLogs },
        english: { total: englishTotal, goal: settings.englishGoalMinutes, logs: englishLogs },
      },
      weight: {
        latest: latestWeight?.weight ?? null,
        loggedAt: latestWeight?.loggedAt ?? null,
        due: weightDue,
        daysAgo: daysAgoWeight,
      },
      gamification: { streak, points },
    }
  })
}

function calcPoints(data: {
  waterTotal: number
  waterGoal: number
  activityTotal: number
  activityGoal: number
  readingTotal: number
  readingGoal: number
  englishTotal: number
  englishGoal: number
}) {
  let pts = 0
  pts += Math.min(30, Math.round((data.waterTotal / Math.max(data.waterGoal, 1)) * 30))
  pts += Math.min(25, Math.round((data.activityTotal / Math.max(data.activityGoal, 1)) * 25))
  pts += Math.min(15, Math.round((data.readingTotal / Math.max(data.readingGoal, 1)) * 15))
  pts += Math.min(30, Math.round((data.englishTotal / Math.max(data.englishGoal, 1)) * 30))
  return pts
}

async function calcStreak(userId: string): Promise<number> {
  const logs = await prisma.waterLog.findMany({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
    select: { loggedAt: true },
  })

  if (logs.length === 0) return 0

  const days = new Set(logs.map((l) => toLocalDateStr(l.loggedAt)))
  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = toLocalDateStr(d)
    if (days.has(key)) streak++
    else break
  }
  return streak
}
