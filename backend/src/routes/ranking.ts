import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Batch-load ALL month data in 7 queries instead of 7 × N days
  const [mWater, mAct, mRead, mEng, mWeight, mTaskLogs, mGroupTasks] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.englishLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.weightLog.findMany({ where: { userId, isOfficial: true, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.groupTaskLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.groupTask.findMany({ where: { active: true } }),
  ])

  // Group by day key YYYY-MM-DD
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const waterByDay = new Map<string, number>()
  mWater.forEach(l => { const k = dayKey(l.loggedAt); waterByDay.set(k, (waterByDay.get(k) ?? 0) + l.amountMl) })
  const actByDay = new Map<string, number>()
  mAct.forEach(l => { const k = dayKey(l.loggedAt); actByDay.set(k, (actByDay.get(k) ?? 0) + l.durationMinutes) })
  const readByDay = new Map<string, number>()
  mRead.forEach(l => { const k = dayKey(l.loggedAt); readByDay.set(k, (readByDay.get(k) ?? 0) + l.durationMinutes) })
  const engByDay = new Map<string, number>()
  mEng.forEach(l => { const k = dayKey(l.loggedAt); engByDay.set(k, (engByDay.get(k) ?? 0) + (l.durationMinutes ?? settings.englishGoalMinutes)) })
  const weightByDay = new Map<string, boolean>()
  mWeight.forEach(l => weightByDay.set(dayKey(l.loggedAt), true))
  const taskCompletedByDay = new Map<string, Set<string>>()
  mTaskLogs.forEach(l => { const k = dayKey(l.loggedAt); if (!taskCompletedByDay.has(k)) taskCompletedByDay.set(k, new Set()); taskCompletedByDay.get(k)!.add(l.taskId) })

  // Sum points across all days this month
  const activeDays = new Set([
    ...waterByDay.keys(), ...actByDay.keys(), ...readByDay.keys(),
    ...engByDay.keys(), ...weightByDay.keys(), ...taskCompletedByDay.keys(),
  ])

  let monthlyPoints = 0
  for (const k of activeDays) {
    const taskPts = [...(taskCompletedByDay.get(k) ?? [])].reduce((s, tid) => {
      return s + (mGroupTasks.find(t => t.id === tid)?.pointValue ?? 0)
    }, 0)
    monthlyPoints += calcPoints({
      waterTotal: waterByDay.get(k) ?? 0, waterGoal: settings.waterGoalMl,
      activityTotal: actByDay.get(k) ?? 0, activityGoal: settings.activityGoalMinutes,
      readingTotal: readByDay.get(k) ?? 0, readingGoal: settings.readingGoalMinutes,
      englishMinutes: engByDay.get(k) ?? 0,
      officialWeightPoints: weightByDay.has(k) ? 15 : 0,
      groupTaskPoints: taskPts,
    })
  }

  // Today's points (subset of above, use same batch data)
  const todayKey = dayKey(now)
  const todayTaskPts = [...(taskCompletedByDay.get(todayKey) ?? [])].reduce((s, tid) => {
    return s + (mGroupTasks.find(t => t.id === tid)?.pointValue ?? 0)
  }, 0)
  const todayPoints = calcPoints({
    waterTotal: waterByDay.get(todayKey) ?? 0, waterGoal: settings.waterGoalMl,
    activityTotal: actByDay.get(todayKey) ?? 0, activityGoal: settings.activityGoalMinutes,
    readingTotal: readByDay.get(todayKey) ?? 0, readingGoal: settings.readingGoalMinutes,
    englishMinutes: engByDay.get(todayKey) ?? 0,
    officialWeightPoints: weightByDay.has(todayKey) ? 15 : 0,
    groupTaskPoints: todayTaskPts,
  })

  const [streak, latestWeight] = await Promise.all([
    calcStreak(userId),
    prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } }),
  ])
  const totalPoints = streak * 50 + monthlyPoints

  const level = totalPoints < 500 ? 1 : totalPoints < 1500 ? 2
    : totalPoints < 3000 ? 3 : totalPoints < 6000 ? 4 : 5
  const levelNames = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']

  return {
    userId, name: user.name, isAdmin: user.isAdmin,
    todayPoints, monthlyPoints, streak,
    level, levelName: levelNames[level], totalPoints,
    today: {
      water: { total: waterByDay.get(todayKey) ?? 0, goal: settings.waterGoalMl },
      activity: { total: actByDay.get(todayKey) ?? 0, goal: settings.activityGoalMinutes },
      reading: { total: readByDay.get(todayKey) ?? 0, goal: settings.readingGoalMinutes },
      english: { studied: (engByDay.get(todayKey) ?? 0) > 0 },
      groupTasksCompleted: taskCompletedByDay.get(todayKey)?.size ?? 0,
      groupTasksTotal: mGroupTasks.length,
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
