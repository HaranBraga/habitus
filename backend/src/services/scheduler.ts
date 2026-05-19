import cron from 'node-cron'
import { prisma } from '../server'
import {
  sendWhatsApp,
  buildWaterReminderMessage,
  buildWeightReminderMessage,
  buildDailySummaryMessage,
} from './evolution'
import { startOfDay, endOfDay } from '../utils/date'

export function startScheduler() {
  // Verifica água a cada hora e envia lembrete se necessário
  cron.schedule('0 * * * *', checkWaterReminders)

  // Verifica peso a cada dia às 8h
  cron.schedule('0 8 * * *', checkWeightReminders)

  // Resumo diário às 21h
  cron.schedule('0 21 * * *', sendDailySummaries)

  console.log('Scheduler de lembretes iniciado')
}

async function checkWaterReminders() {
  const users = await prisma.user.findMany({ include: { settings: true } })

  for (const user of users) {
    const intervalHours = user.settings?.waterReminderIntervalHours ?? 2
    const since = new Date(Date.now() - intervalHours * 60 * 60 * 1000)

    const recentLog = await prisma.waterLog.findFirst({
      where: { userId: user.id, loggedAt: { gte: since } },
    })

    if (!recentLog) {
      const msg = buildWaterReminderMessage(user.name)
      await sendWhatsApp(user.phone, msg)
    }
  }
}

async function checkWeightReminders() {
  const users = await prisma.user.findMany({ include: { settings: true } })

  for (const user of users) {
    const intervalDays = user.settings?.weightCheckIntervalDays ?? 7

    const latest = await prisma.weightLog.findFirst({
      where: { userId: user.id },
      orderBy: { loggedAt: 'desc' },
    })

    const daysAgo = latest
      ? Math.floor((Date.now() - latest.loggedAt.getTime()) / 86400000)
      : intervalDays + 1

    if (daysAgo >= intervalDays) {
      const msg = buildWeightReminderMessage(user.name, daysAgo)
      await sendWhatsApp(user.phone, msg)
    }
  }
}

async function sendDailySummaries() {
  const users = await prisma.user.findMany({ include: { settings: true } })
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)

  for (const user of users) {
    const [waterLogs, activityLogs, readingLogs, englishLog, latestWeight] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.activityLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.readingLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.englishLog.findFirst({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.weightLog.findFirst({ where: { userId: user.id }, orderBy: { loggedAt: 'desc' } }),
    ])

    const waterGoal = user.settings?.waterGoalMl ?? 2000
    const activityGoal = user.settings?.activityGoalMinutes ?? 30
    const readingGoal = user.settings?.readingGoalMinutes ?? 20
    const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0)
    const activityTotal = activityLogs.reduce((s, l) => s + l.durationMinutes, 0)
    const readingTotal = readingLogs.reduce((s, l) => s + l.durationMinutes, 0)

    const streak = await calcStreak(user.id)
    const points = calcPoints({ waterTotal, waterGoal, activityTotal, activityGoal, readingTotal, readingGoal, englishStudied: !!englishLog })

    const msg = buildDailySummaryMessage(user.name, {
      waterTotal, waterGoal, activityTotal, englishStudied: !!englishLog, readingTotal, streak, points,
    })
    await sendWhatsApp(user.phone, msg)
  }
}

function calcPoints(data: {
  waterTotal: number; waterGoal: number; activityTotal: number; activityGoal: number
  readingTotal: number; readingGoal: number; englishStudied: boolean
}) {
  let pts = 0
  if (data.waterTotal >= data.waterGoal) pts += 30
  else if (data.waterTotal > 0) pts += Math.floor((data.waterTotal / data.waterGoal) * 20)
  if (data.activityTotal >= data.activityGoal) pts += 25
  else if (data.activityTotal > 0) pts += Math.floor((data.activityTotal / data.activityGoal) * 15)
  if (data.readingTotal >= data.readingGoal) pts += 25
  else if (data.readingTotal > 0) pts += Math.floor((data.readingTotal / data.readingGoal) * 15)
  if (data.englishStudied) pts += 20
  return pts
}

async function calcStreak(userId: string): Promise<number> {
  const logs = await prisma.waterLog.findMany({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
    select: { loggedAt: true },
  })
  if (logs.length === 0) return 0
  const days = new Set(logs.map((l) => l.loggedAt.toISOString().slice(0, 10)))
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
