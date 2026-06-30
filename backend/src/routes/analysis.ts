import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { analyzeUserProgress } from '../services/deepseek'
import { toLocalDateStr } from '../utils/date'
import { getUserFullStats } from './ranking'
import { calcWeightGoal } from './weight'

export async function analysisRoutes(app: FastifyInstance) {
  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { settings: true } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const since7d = new Date(Date.now() - 7 * 86400000)
    const since30d = new Date(Date.now() - 30 * 86400000)

    const [weightHistory, waterLogs7d, actLogs7d, readLogs7d, engLogs7d, fullStats] = await Promise.all([
      prisma.weightLog.findMany({
        where: { userId, loggedAt: { gte: since30d } },
        orderBy: { loggedAt: 'desc' },
        select: { weight: true, loggedAt: true, isOfficial: true },
      }),
      prisma.waterLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      prisma.activityLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      prisma.readingLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      prisma.englishLog.findMany({ where: { userId, loggedAt: { gte: since7d } } }),
      getUserFullStats(userId),
    ])

    if (!fullStats) return reply.status(404).send({ error: 'Usuário não encontrado' })

    // Day grouping uses the Acre calendar (toLocalDateStr), matching the rest of the app —
    // avoids the off-by-one bug that UTC-based slicing would cause for users near midnight.
    const waterDays = new Set(waterLogs7d.map((l) => toLocalDateStr(l.loggedAt)))
    const waterAvg7d = waterDays.size > 0
      ? Math.round(waterLogs7d.reduce((s, l) => s + l.amountMl, 0) / waterDays.size)
      : 0

    const actDays = new Set(actLogs7d.map((l) => toLocalDateStr(l.loggedAt)))
    const actAvg7d = actDays.size > 0
      ? Math.round(actLogs7d.reduce((s, l) => s + l.durationMinutes, 0) / actDays.size)
      : 0

    const readDays = new Set(readLogs7d.map((l) => toLocalDateStr(l.loggedAt)))
    const readAvg7d = readDays.size > 0
      ? Math.round(readLogs7d.reduce((s, l) => s + l.durationMinutes, 0) / readDays.size)
      : 0

    const engDays7d = new Set(engLogs7d.map((l) => toLocalDateStr(l.loggedAt))).size

    // Per-day series for the last 7 days (oldest first), Acre calendar — feeds the bar charts.
    const dailyTrend: { date: string; water: number; activity: number; reading: number; english: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = toLocalDateStr(new Date(Date.now() - i * 86400000))
      dailyTrend.push({
        date,
        water: waterLogs7d.filter((l) => toLocalDateStr(l.loggedAt) === date).reduce((s, l) => s + l.amountMl, 0),
        activity: actLogs7d.filter((l) => toLocalDateStr(l.loggedAt) === date).reduce((s, l) => s + l.durationMinutes, 0),
        reading: readLogs7d.filter((l) => toLocalDateStr(l.loggedAt) === date).reduce((s, l) => s + l.durationMinutes, 0),
        english: engLogs7d.filter((l) => toLocalDateStr(l.loggedAt) === date).reduce((s, l) => s + (l.durationMinutes ?? 0), 0),
      })
    }

    const weightGoal = calcWeightGoal(user.height)
    const targetWeight = user.settings?.weightGoalKg ?? weightGoal.ideal
    const latestWeight = weightHistory[0]?.weight ?? null
    const distanceToGoal = latestWeight !== null ? Math.round((latestWeight - targetWeight) * 10) / 10 : null

    const { analysis, sections } = await analyzeUserProgress({
      name: user.name,
      weightHistory: weightHistory.map((w) => ({
        weight: w.weight,
        loggedAt: w.loggedAt.toISOString(),
      })),
      latestWeight,
      targetWeight,
      distanceToGoal,
      waterAvg7d,
      waterGoal: user.settings?.waterGoalMl ?? 2000,
      activityAvg7d: actAvg7d,
      activityGoal: user.settings?.activityGoalMinutes ?? 30,
      readingAvg7d: readAvg7d,
      readingGoal: user.settings?.readingGoalMinutes ?? 20,
      englishDays7d: engDays7d,
      streak: fullStats.streak,
      level: fullStats.level,
      levelName: fullStats.levelName,
      monthlyPoints: fullStats.monthlyPoints,
      totalPoints: fullStats.totalPoints,
      groupTasksCompletedToday: fullStats.today.groupTasksCompleted,
      groupTasksTotalToday: fullStats.today.groupTasksTotal,
    })

    return {
      analysis,
      sections,
      data: {
        waterAvg7d,
        activityAvg7d: actAvg7d,
        readingAvg7d: readAvg7d,
        englishDays7d: engDays7d,
        weightHistory: weightHistory.slice(0, 10),
        dailyTrend,
        streak: fullStats.streak,
        level: fullStats.level,
        levelName: fullStats.levelName,
        monthlyPoints: fullStats.monthlyPoints,
        totalPoints: fullStats.totalPoints,
        targetWeight,
        distanceToGoal,
        groupTasksCompletedToday: fullStats.today.groupTasksCompleted,
        groupTasksTotalToday: fullStats.today.groupTasksTotal,
      },
    }
  })
}
