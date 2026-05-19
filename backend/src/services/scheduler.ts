import cron from 'node-cron'
import { prisma } from '../server'
import { sendWhatsApp, buildWeightReminderMessage, buildDailySummaryMessage } from './evolution'
import { generateSmartWaterMessage } from './deepseek'
import { startOfDay, endOfDay } from '../utils/date'

export function startScheduler() {
  // Verifica água a cada hora das 7h às 22h
  cron.schedule('0 7-22 * * *', checkWaterReminders)

  // Verifica peso todo dia às 8h
  cron.schedule('0 8 * * *', checkWeightReminders)

  // Resumo diário às 21h
  cron.schedule('0 21 * * *', sendDailySummaries)

  console.log('Scheduler de lembretes iniciado')
}

async function checkWaterReminders() {
  const now = new Date()
  const hour = now.getHours()
  const users = await prisma.user.findMany({ include: { settings: true } })

  for (const user of users) {
    const intervalHours = user.settings?.waterReminderIntervalHours ?? 2
    const waterGoal = user.settings?.waterGoalMl ?? 2000
    const since = new Date(Date.now() - intervalHours * 3600000)

    const recentLog = await prisma.waterLog.findFirst({
      where: { userId: user.id, loggedAt: { gte: since } },
    })

    if (recentLog) continue

    const todayLogs = await prisma.waterLog.findMany({
      where: { userId: user.id, loggedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
    })
    const todayTotal = todayLogs.reduce((s, l) => s + l.amountMl, 0)

    if (todayTotal >= waterGoal) continue

    // Urgente: passada das 14h e menos de 500ml
    const isUrgent = hour >= 14 && todayTotal < 500

    const msg = await generateSmartWaterMessage(user.name, todayTotal, waterGoal, hour)
    const prefix = isUrgent ? '🚨 *URGENTE* — ' : ''
    await sendWhatsApp(user.phone, prefix + msg)
  }
}

async function checkWeightReminders() {
  const users = await prisma.user.findMany({ include: { settings: true } })
  for (const user of users) {
    const intervalDays = user.settings?.weightCheckIntervalDays ?? 7
    const latest = await prisma.weightLog.findFirst({
      where: { userId: user.id }, orderBy: { loggedAt: 'desc' },
    })
    const daysAgo = latest
      ? Math.floor((Date.now() - latest.loggedAt.getTime()) / 86400000)
      : intervalDays + 1

    if (daysAgo >= intervalDays) {
      await sendWhatsApp(user.phone, buildWeightReminderMessage(user.name, daysAgo))
    }
  }
}

async function sendDailySummaries() {
  const users = await prisma.user.findMany({ include: { settings: true } })
  const now = new Date()

  for (const user of users) {
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)
    const [waterLogs, actLogs, readLogs, engLog, weightLog] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.activityLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.readingLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.englishLog.findFirst({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.weightLog.findFirst({ where: { userId: user.id }, orderBy: { loggedAt: 'desc' } }),
    ])

    const waterGoal = user.settings?.waterGoalMl ?? 2000
    const actGoal = user.settings?.activityGoalMinutes ?? 30
    const readGoal = user.settings?.readingGoalMinutes ?? 20

    const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0)
    const actTotal = actLogs.reduce((s, l) => s + l.durationMinutes, 0)
    const readTotal = readLogs.reduce((s, l) => s + l.durationMinutes, 0)

    let points = 0
    points += Math.min(30, Math.round((waterTotal / waterGoal) * 30))
    points += Math.min(25, Math.round((actTotal / actGoal) * 25))
    points += Math.min(15, Math.round((readTotal / readGoal) * 15))
    if (engLog) points += 20 + Math.min(10, Math.floor((engLog.durationMinutes ?? 15) / 5))

    const allWater = await prisma.waterLog.findMany({
      where: { userId: user.id }, select: { loggedAt: true },
    })
    const days = new Set(allWater.map((l) => l.loggedAt.toISOString().slice(0, 10)))
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      if (days.has(d.toISOString().slice(0, 10))) streak++
      else break
    }

    const msg = buildDailySummaryMessage(user.name, {
      waterTotal, waterGoal, activityTotal: actTotal, englishStudied: !!engLog,
      readingTotal: readTotal, streak, points,
    })
    await sendWhatsApp(user.phone, msg)
  }
}
