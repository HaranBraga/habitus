import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { startOfDay, endOfDay } from '../utils/date'

function calcDayPoints(data: {
  waterTotal: number; waterGoal: number
  activityTotal: number; activityGoal: number
  readingTotal: number; readingGoal: number
  englishMinutes: number; englishGoal: number
  weightLogged: boolean
  customTaskPoints: number
}): number {
  let pts = 0
  // Water: 0-30pts proportional
  pts += Math.min(30, Math.round((data.waterTotal / data.waterGoal) * 30))
  // Activity: 0-25pts proportional
  pts += Math.min(25, Math.round((data.activityTotal / data.activityGoal) * 25))
  // Reading: 0-15pts proportional
  pts += Math.min(15, Math.round((data.readingTotal / data.readingGoal) * 15))
  // English: 20pts base + 1pt per 5min bonus (max 10)
  if (data.englishMinutes > 0) {
    pts += 20 + Math.min(10, Math.floor(data.englishMinutes / 5))
  }
  // Weight: 10pts
  if (data.weightLogged) pts += 10
  // Custom tasks
  pts += data.customTaskPoints
  return pts
}

async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } })
  if (!user) return null

  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)

  const settings = user.settings ?? {
    waterGoalMl: 2000, activityGoalMinutes: 30,
    readingGoalMinutes: 20, englishGoalMinutes: 15,
    weightCheckIntervalDays: 7,
  }

  const [waterLogs, actLogs, readLogs, engLog, weightLog, customLogs, customTasks, weekWater] =
    await Promise.all([
      prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.englishLog.findFirst({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } }),
      prisma.customTaskLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.customTask.findMany({ where: { userId, active: true } }),
      prisma.waterLog.findMany({
        where: { userId, loggedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ])

  const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0)
  const actTotal = actLogs.reduce((s, l) => s + l.durationMinutes, 0)
  const readTotal = readLogs.reduce((s, l) => s + l.durationMinutes, 0)
  const engMin = engLog?.durationMinutes ?? (engLog ? settings.englishGoalMinutes : 0)
  const customTaskPoints = customLogs.reduce((s, log) => {
    const task = customTasks.find((t) => t.id === log.taskId)
    return s + (task?.pointValue ?? 0)
  }, 0)

  const todayPoints = calcDayPoints({
    waterTotal, waterGoal: settings.waterGoalMl,
    activityTotal: actTotal, activityGoal: settings.activityGoalMinutes,
    readingTotal: readTotal, readingGoal: settings.readingGoalMinutes,
    englishMinutes: engMin, englishGoal: settings.englishGoalMinutes,
    weightLogged: !!weightLog && Math.floor((Date.now() - weightLog.loggedAt.getTime()) / 86400000) === 0,
    customTaskPoints,
  })

  // Streak calculation
  const allWaterDays = await prisma.waterLog.findMany({
    where: { userId }, orderBy: { loggedAt: 'desc' }, select: { loggedAt: true },
  })
  const days = new Set(allWaterDays.map((l) => l.loggedAt.toISOString().slice(0, 10)))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (days.has(d.toISOString().slice(0, 10))) streak++
    else break
  }

  // Total accumulated points (last 90 days estimate)
  const totalPoints = streak * 50 + todayPoints

  // Level
  const level = totalPoints < 500 ? 1
    : totalPoints < 1500 ? 2
    : totalPoints < 3000 ? 3
    : totalPoints < 6000 ? 4
    : 5
  const levelNames = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']

  // Week water avg
  const weekDays = new Set(weekWater.map((l) => l.loggedAt.toISOString().slice(0, 10)))
  const weekWaterAvg = weekDays.size > 0
    ? weekWater.reduce((s, l) => s + l.amountMl, 0) / weekDays.size
    : 0

  return {
    userId,
    name: user.name,
    todayPoints,
    streak,
    level,
    levelName: levelNames[level],
    totalPoints,
    today: {
      water: { total: waterTotal, goal: settings.waterGoalMl },
      activity: { total: actTotal, goal: settings.activityGoalMinutes },
      reading: { total: readTotal, goal: settings.readingGoalMinutes },
      english: { studied: !!engLog, minutes: engMin },
      customTasksCompleted: customLogs.length,
      customTasksTotal: customTasks.length,
    },
    weekWaterAvg: Math.round(weekWaterAvg),
    latestWeight: weightLog?.weight ?? null,
  }
}

export async function rankingRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const users = await prisma.user.findMany({ select: { id: true } })
    const stats = await Promise.all(users.map((u) => getUserStats(u.id)))
    return stats.filter(Boolean).sort((a, b) => (b!.todayPoints - a!.todayPoints))
  })

  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const stats = await getUserStats(userId)
    if (!stats) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return stats
  })
}
