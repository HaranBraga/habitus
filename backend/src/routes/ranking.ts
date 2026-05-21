import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { startOfDay, endOfDay } from '../utils/date'
import { calcWeightPoints, calcWeightGoal } from './weight'

function calcPoints(data: {
  waterTotal: number; waterGoal: number
  activityTotal: number; activityGoal: number
  readingTotal: number; readingGoal: number
  englishMinutes: number
  officialWeightPoints: number
  groupTaskPoints: number
}): number {
  let pts = 0
  pts += Math.min(30, Math.round((data.waterTotal / Math.max(data.waterGoal, 1)) * 30))
  pts += Math.min(25, Math.round((data.activityTotal / Math.max(data.activityGoal, 1)) * 25))
  pts += Math.min(15, Math.round((data.readingTotal / Math.max(data.readingGoal, 1)) * 15))
  if (data.englishMinutes > 0) pts += 20 + Math.min(10, Math.floor(data.englishMinutes / 5))
  pts += data.officialWeightPoints
  pts += data.groupTaskPoints
  return pts
}

async function calcStreak(userId: string): Promise<number> {
  const logs = await prisma.waterLog.findMany({
    where: { userId }, orderBy: { loggedAt: 'desc' }, select: { loggedAt: true },
  })
  const days = new Set(logs.map(l => l.loggedAt.toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (days.has(d.toISOString().slice(0, 10))) streak++
    else break
  }
  return streak
}

async function getDayStats(userId: string, date: Date, settings: { waterGoalMl: number; activityGoalMinutes: number; readingGoalMinutes: number; englishGoalMinutes: number; weightCheckIntervalDays: number }) {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const [waterLogs, actLogs, readLogs, engLog, weightLog, taskLogs, groupTasks] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.englishLog.findFirst({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    // Only official weight counts for points
    prisma.weightLog.findFirst({ where: { userId, isOfficial: true, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.groupTaskLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.groupTask.findMany({ where: { active: true } }),
  ])

  const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0)
  const actTotal = actLogs.reduce((s, l) => s + l.durationMinutes, 0)
  const readTotal = readLogs.reduce((s, l) => s + l.durationMinutes, 0)
  const engMin = engLog?.durationMinutes ?? (engLog ? settings.englishGoalMinutes : 0)
  const completedTaskIds = new Set(taskLogs.map(l => l.taskId))
  const groupTaskPoints = groupTasks
    .filter(t => completedTaskIds.has(t.id))
    .reduce((s, t) => s + t.pointValue, 0)

  let officialWeightPoints = 0
  if (weightLog) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user) {
      const goal = calcWeightGoal(user.height)
      const prevOfficial = await prisma.weightLog.findFirst({
        where: { userId, isOfficial: true, loggedAt: { lt: dayStart } },
        orderBy: { loggedAt: 'desc' },
      })
      const { points } = calcWeightPoints(weightLog.weight, prevOfficial?.weight ?? null, goal.ideal)
      officialWeightPoints = points
    }
  }

  return calcPoints({
    waterTotal, waterGoal: settings.waterGoalMl,
    activityTotal: actTotal, activityGoal: settings.activityGoalMinutes,
    readingTotal: readTotal, readingGoal: settings.readingGoalMinutes,
    englishMinutes: engMin,
    officialWeightPoints,
    groupTaskPoints,
  })
}

async function getUserFullStats(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } })
  if (!user) return null

  const settings = {
    waterGoalMl: user.settings?.waterGoalMl ?? 2000,
    activityGoalMinutes: user.settings?.activityGoalMinutes ?? 30,
    readingGoalMinutes: user.settings?.readingGoalMinutes ?? 20,
    englishGoalMinutes: user.settings?.englishGoalMinutes ?? 15,
    weightCheckIntervalDays: user.settings?.weightCheckIntervalDays ?? 7,
  }

  const now = new Date()

  // Today's points
  const todayPoints = await getDayStats(userId, now, settings)

  // Monthly points — sum each day of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = Math.min(now.getDate(), 31)
  let monthlyPoints = 0
  for (let d = 0; d < daysInMonth; d++) {
    const day = new Date(monthStart)
    day.setDate(day.getDate() + d)
    if (day <= now) {
      monthlyPoints += await getDayStats(userId, day, settings)
    }
  }

  const streak = await calcStreak(userId)
  const totalPoints = streak * 50 + monthlyPoints

  const level = totalPoints < 500 ? 1 : totalPoints < 1500 ? 2
    : totalPoints < 3000 ? 3 : totalPoints < 6000 ? 4 : 5
  const levelNames = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']

  // Today's details
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const [waterLogs, actLogs, readLogs, engLog, taskLogs, groupTasks] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.englishLog.findFirst({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.groupTaskLog.findMany({ where: { userId, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    prisma.groupTask.findMany({ where: { active: true } }),
  ])

  const latestWeight = await prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } })

  return {
    userId, name: user.name, isAdmin: user.isAdmin,
    todayPoints, monthlyPoints, streak,
    level, levelName: levelNames[level], totalPoints,
    today: {
      water: { total: waterLogs.reduce((s, l) => s + l.amountMl, 0), goal: settings.waterGoalMl },
      activity: { total: actLogs.reduce((s, l) => s + l.durationMinutes, 0), goal: settings.activityGoalMinutes },
      reading: { total: readLogs.reduce((s, l) => s + l.durationMinutes, 0), goal: settings.readingGoalMinutes },
      english: { studied: !!engLog },
      groupTasksCompleted: taskLogs.length,
      groupTasksTotal: groupTasks.length,
    },
    latestWeight: latestWeight?.weight ?? null,
  }
}

export async function rankingRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const users = await prisma.user.findMany({ select: { id: true } })
    const stats = await Promise.all(users.map(u => getUserFullStats(u.id)))
    return stats.filter(Boolean)
  })

  app.get('/daily', async () => {
    const users = await prisma.user.findMany({ select: { id: true } })
    const stats = await Promise.all(users.map(u => getUserFullStats(u.id)))
    return stats.filter(Boolean).sort((a, b) => b!.todayPoints - a!.todayPoints)
  })

  app.get('/monthly', async () => {
    const users = await prisma.user.findMany({ select: { id: true } })
    const stats = await Promise.all(users.map(u => getUserFullStats(u.id)))
    return stats.filter(Boolean).sort((a, b) => b!.monthlyPoints - a!.monthlyPoints)
  })

  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const stats = await getUserFullStats(userId)
    if (!stats) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return stats
  })
}
