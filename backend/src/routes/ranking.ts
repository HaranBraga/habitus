import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { calcWeightPoints, calcWeightGoal } from './weight'
import { toLocalDateStr } from '../utils/date'

function calcPoints(data: {
  waterTotal: number; waterGoal: number
  activityTotal: number; activityGoal: number
  readingTotal: number; readingGoal: number
  englishTotal: number; englishGoal: number
  officialWeightPoints: number
  groupTaskPoints: number
}): number {
  let pts = 0
  pts += Math.min(30, Math.round((data.waterTotal / Math.max(data.waterGoal, 1)) * 30))
  pts += Math.min(25, Math.round((data.activityTotal / Math.max(data.activityGoal, 1)) * 25))
  pts += Math.min(15, Math.round((data.readingTotal / Math.max(data.readingGoal, 1)) * 15))
  pts += Math.min(30, Math.round((data.englishTotal / Math.max(data.englishGoal, 1)) * 30))
  pts += data.officialWeightPoints
  pts += data.groupTaskPoints
  return pts
}

async function calcStreak(userId: string): Promise<number> {
  const logs = await prisma.waterLog.findMany({
    where: { userId }, orderBy: { loggedAt: 'desc' }, select: { loggedAt: true },
  })
  const days = new Set(logs.map(l => toLocalDateStr(l.loggedAt)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (days.has(toLocalDateStr(d))) streak++
    else break
  }
  return streak
}

const pad2 = (n: number) => String(n).padStart(2, '0')

async function getUserFullStats(userId: string, target?: { year: number; month: number }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } })
  if (!user) return null

  const settings = {
    waterGoalMl: user.settings?.waterGoalMl ?? 2000,
    activityGoalMinutes: user.settings?.activityGoalMinutes ?? 30,
    readingGoalMinutes: user.settings?.readingGoalMinutes ?? 20,
    englishGoalMinutes: user.settings?.englishGoalMinutes ?? 15,
    weightCheckIntervalDays: user.settings?.weightCheckIntervalDays ?? 7,
  }

  // All date logic below is anchored to the Acre (UTC-5) calendar, independent of the
  // server process's own timezone — avoids off-by-one day shifts in month/day boundaries
  const [nowYear, nowMonth, nowDay] = toLocalDateStr(new Date()).split('-').map(Number)
  const { year, month } = target ?? { year: nowYear, month: nowMonth }
  const monthStart = new Date(`${year}-${pad2(month)}-01T00:00:00-05:00`)
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthEnd = new Date(`${year}-${pad2(month)}-${pad2(daysInMonth)}T23:59:59.999-05:00`)
  const isCurrentMonth = year === nowYear && month === nowMonth
  const lastDay = isCurrentMonth ? nowDay : daysInMonth

  // Batch-load ALL month data in a handful of queries instead of N × days
  const [mWater, mAct, mRead, mEng, allOfficialWeights, mTaskLogs, mGroupTasks] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.englishLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.weightLog.findMany({ where: { userId, isOfficial: true }, orderBy: { loggedAt: 'asc' } }),
    prisma.groupTaskLog.findMany({ where: { userId, loggedAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.groupTask.findMany({ where: { active: true } }),
  ])

  // Group by day key YYYY-MM-DD in Acre timezone
  const dayKey = (d: Date) => toLocalDateStr(d)
  const waterByDay = new Map<string, number>()
  mWater.forEach(l => { const k = dayKey(l.loggedAt); waterByDay.set(k, (waterByDay.get(k) ?? 0) + l.amountMl) })
  const actByDay = new Map<string, number>()
  mAct.forEach(l => { const k = dayKey(l.loggedAt); actByDay.set(k, (actByDay.get(k) ?? 0) + l.durationMinutes) })
  const readByDay = new Map<string, number>()
  mRead.forEach(l => { const k = dayKey(l.loggedAt); readByDay.set(k, (readByDay.get(k) ?? 0) + l.durationMinutes) })
  const engByDay = new Map<string, number>()
  mEng.forEach(l => { const k = dayKey(l.loggedAt); engByDay.set(k, (engByDay.get(k) ?? 0) + (l.durationMinutes ?? 0)) })
  const taskCompletedByDay = new Map<string, Set<string>>()
  mTaskLogs.forEach(l => { const k = dayKey(l.loggedAt); if (!taskCompletedByDay.has(k)) taskCompletedByDay.set(k, new Set()); taskCompletedByDay.get(k)!.add(l.taskId) })

  // Weight points: each official weigh-in gains/loses points based on movement toward the target weight
  const weightGoal = calcWeightGoal(user.height)
  const targetWeight = user.settings?.weightGoalKg ?? weightGoal.ideal
  const weightPointsByDay = new Map<string, number>()
  let prevOfficial: number | null = null
  for (const w of allOfficialWeights) {
    const { points } = calcWeightPoints(w.weight, prevOfficial, targetWeight)
    const k = dayKey(w.loggedAt)
    weightPointsByDay.set(k, (weightPointsByDay.get(k) ?? 0) + points)
    prevOfficial = w.weight
  }

  const taskPointsForDay = (k: string) => [...(taskCompletedByDay.get(k) ?? [])].reduce((s, tid) => {
    return s + (mGroupTasks.find(t => t.id === tid)?.pointValue ?? 0)
  }, 0)

  const pointsForDay = (k: string) => calcPoints({
    waterTotal: waterByDay.get(k) ?? 0, waterGoal: settings.waterGoalMl,
    activityTotal: actByDay.get(k) ?? 0, activityGoal: settings.activityGoalMinutes,
    readingTotal: readByDay.get(k) ?? 0, readingGoal: settings.readingGoalMinutes,
    englishTotal: engByDay.get(k) ?? 0, englishGoal: settings.englishGoalMinutes,
    officialWeightPoints: weightPointsByDay.get(k) ?? 0,
    groupTaskPoints: taskPointsForDay(k),
  })

  // Per-day breakdown for the selected month (1..lastDay)
  const days: { date: string; points: number }[] = []
  let monthlyPoints = 0
  for (let d = 1; d <= lastDay; d++) {
    const k = `${year}-${pad2(month)}-${pad2(d)}`
    const pts = pointsForDay(k)
    days.push({ date: k, points: pts })
    monthlyPoints += pts
  }

  // Today's points (Acre calendar "today", or 1st of month for past months)
  const todayKey = isCurrentMonth ? toLocalDateStr(new Date()) : `${year}-${pad2(month)}-01`
  const todayPoints = pointsForDay(todayKey)

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
    todayPoints, monthlyPoints, streak, days,
    level, levelName: levelNames[level], totalPoints,
    today: {
      water: { total: waterByDay.get(todayKey) ?? 0, goal: settings.waterGoalMl },
      activity: { total: actByDay.get(todayKey) ?? 0, goal: settings.activityGoalMinutes },
      reading: { total: readByDay.get(todayKey) ?? 0, goal: settings.readingGoalMinutes },
      english: { total: engByDay.get(todayKey) ?? 0, goal: settings.englishGoalMinutes },
      groupTasksCompleted: taskCompletedByDay.get(todayKey)?.size ?? 0,
      groupTasksTotal: mGroupTasks.length,
    },
    latestWeight: latestWeight?.weight ?? null,
  }
}

function parseMonthParam(month: unknown): { year: number; month: number } {
  if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split('-').map(Number)
    return { year, month: mon }
  }
  const [year, mon] = toLocalDateStr(new Date()).split('-').map(Number)
  return { year, month: mon }
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

  app.get('/monthly', async (req) => {
    const { month } = req.query as { month?: string }
    const target = parseMonthParam(month)
    const users = await prisma.user.findMany({ select: { id: true } })
    const stats = await Promise.all(users.map(u => getUserFullStats(u.id, target)))
    return stats.filter(Boolean).sort((a, b) => b!.monthlyPoints - a!.monthlyPoints)
  })

  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const stats = await getUserFullStats(userId)
    if (!stats) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return stats
  })

  app.get('/:userId/evolution', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const { months } = req.query as { months?: string }
    const count = Math.min(12, Math.max(1, Number(months) || 6))

    const [nowYear, nowMonth] = toLocalDateStr(new Date()).split('-').map(Number)
    const results = []
    for (let i = count - 1; i >= 0; i--) {
      let m = nowMonth - i
      let y = nowYear
      while (m <= 0) { m += 12; y -= 1 }
      const stats = await getUserFullStats(userId, { year: y, month: m })
      if (!stats) return reply.status(404).send({ error: 'Usuário não encontrado' })
      results.push({
        month: `${y}-${pad2(m)}`,
        monthlyPoints: stats.monthlyPoints,
        days: stats.days,
      })
    }

    const weightHistory = await prisma.weightLog.findMany({
      where: { userId, isOfficial: true },
      orderBy: { loggedAt: 'asc' },
    })

    return { months: results, weightHistory }
  })
}
