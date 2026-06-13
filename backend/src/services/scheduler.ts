import cron from 'node-cron'
import { prisma } from '../server'
import { sendWhatsApp, buildWeightReminderMessage, buildDailySummaryMessage } from './evolution'
import { generateSmartWaterMessage } from './deepseek'
import { sendPushToUser } from './webpush'
import { startOfDay, endOfDay, toLocalDateStr } from '../utils/date'

export function startScheduler() {
  cron.schedule('0 7-22 * * *', checkWaterReminders)
  cron.schedule('0 8 * * *', checkWeightReminders)
  cron.schedule('0 21 * * *', sendDailySummaries)
  // Verifica celebração às 22h (depois dos sumários)
  cron.schedule('0 22 * * *', checkCelebration)
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

    const isUrgent = hour >= 14 && todayTotal < 500
    const msg = await generateSmartWaterMessage(user.name, todayTotal, waterGoal, hour)
    const prefix = isUrgent ? '🚨 *URGENTE* — ' : ''
    await sendWhatsApp(user.phone, prefix + msg)
    await sendPushToUser(user.id, isUrgent ? '💧 Atenção!' : '💧 Lembrete de água', msg.slice(0, 120))
  }
}

async function checkWeightReminders() {
  const users = await prisma.user.findMany({ include: { settings: true } })
  for (const user of users) {
    const intervalDays = user.settings?.weightCheckIntervalDays ?? 7
    const latest = await prisma.weightLog.findFirst({
      where: { userId: user.id, isOfficial: true }, orderBy: { loggedAt: 'desc' },
    })
    const daysAgo = latest
      ? Math.floor((Date.now() - latest.loggedAt.getTime()) / 86400000)
      : intervalDays + 1

    if (daysAgo >= intervalDays) {
      const msg = buildWeightReminderMessage(user.name, daysAgo)
      await sendWhatsApp(user.phone, msg)
      await sendPushToUser(user.id, '⚖️ Hora de pesar!', `Você não registra o peso há ${daysAgo} dias.`)
    }
  }
}

async function sendDailySummaries() {
  const users = await prisma.user.findMany({ include: { settings: true } })
  const now = new Date()

  for (const user of users) {
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)
    const [waterLogs, actLogs, readLogs, engLogs] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.activityLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.readingLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.englishLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    ])

    const waterGoal = user.settings?.waterGoalMl ?? 2000
    const actGoal = user.settings?.activityGoalMinutes ?? 30
    const readGoal = user.settings?.readingGoalMinutes ?? 20
    const engGoal = user.settings?.englishGoalMinutes ?? 15
    const waterTotal = waterLogs.reduce((s, l) => s + l.amountMl, 0)
    const actTotal = actLogs.reduce((s, l) => s + l.durationMinutes, 0)
    const readTotal = readLogs.reduce((s, l) => s + l.durationMinutes, 0)
    const engTotal = engLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)

    let points = 0
    points += Math.min(30, Math.round((waterTotal / waterGoal) * 30))
    points += Math.min(25, Math.round((actTotal / actGoal) * 25))
    points += Math.min(15, Math.round((readTotal / readGoal) * 15))
    points += Math.min(30, Math.round((engTotal / engGoal) * 30))

    const allWater = await prisma.waterLog.findMany({ where: { userId: user.id }, select: { loggedAt: true } })
    const days = new Set(allWater.map(l => toLocalDateStr(l.loggedAt)))
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      if (days.has(toLocalDateStr(d))) streak++; else break
    }

    const msg = buildDailySummaryMessage(user.name, {
      waterTotal, waterGoal, activityTotal: actTotal, englishTotal: engTotal, englishGoal: engGoal, readingTotal: readTotal, streak, points,
    })
    await sendWhatsApp(user.phone, msg)
    await sendPushToUser(user.id, '🌙 Resumo do dia', `${points} pts hoje · ${streak} dias de sequência`)
  }
}

async function checkCelebration() {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)

  const users = await prisma.user.findMany({ include: { settings: true } })
  if (users.length < 2) return

  // Check if ALL users completed ALL their main goals
  const results = await Promise.all(users.map(async user => {
    const waterGoal = user.settings?.waterGoalMl ?? 2000
    const actGoal = user.settings?.activityGoalMinutes ?? 30

    const [water, act, eng] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.activityLog.findMany({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.englishLog.findFirst({ where: { userId: user.id, loggedAt: { gte: dayStart, lte: dayEnd } } }),
    ])

    const waterTotal = water.reduce((s, l) => s + l.amountMl, 0)
    const actTotal = act.reduce((s, l) => s + l.durationMinutes, 0)

    return {
      user,
      completed: waterTotal >= waterGoal && actTotal >= actGoal && !!eng,
    }
  }))

  if (results.every(r => r.completed)) {
    const names = results.map(r => r.user.name.split(' ')[0]).join(' e ')
    const celebMsg = `🎉 *MISSÃO CUMPRIDA!*\n\n${names} completaram todas as metas hoje! Isso é incrível! 💪🔥\n\nContinuem assim — consistência é o que transforma hábito em estilo de vida!`
    for (const { user } of results) {
      await sendWhatsApp(user.phone, celebMsg)
      await sendPushToUser(user.id, '🎉 Missão cumprida!', `${names} completaram todas as metas hoje!`)
    }
  }
}
