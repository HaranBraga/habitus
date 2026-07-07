import { FastifyInstance } from 'fastify'
import { prisma } from '../server'
import { startOfDay, endOfDay, toLocalDateStr } from '../utils/date'

type TimelineEntry =
  | { id: string; type: 'water'; loggedAt: string; amountMl: number }
  | { id: string; type: 'activity'; loggedAt: string; durationMinutes: number; description: string | null }
  | { id: string; type: 'reading'; loggedAt: string; durationMinutes: number }
  | { id: string; type: 'english'; loggedAt: string; durationMinutes: number | null }
  | { id: string; type: 'weight'; loggedAt: string; weight: number; isOfficial: boolean }
  | { id: string; type: 'groupTask'; loggedAt: string; title: string; color: string; pointValue: number }

export async function timelineRoutes(app: FastifyInstance) {
  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const { date } = req.query as { date?: string }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    // Anchor at noon so the requested calendar day resolves the same regardless of DST/offset edge cases.
    const requested = date ? new Date(`${date}T12:00:00-05:00`) : new Date()
    if (isNaN(requested.getTime())) return reply.status(400).send({ error: 'Data inválida' })

    const range = { gte: startOfDay(requested), lte: endOfDay(requested) }

    const [water, activity, reading, english, weight, groupTasks] = await Promise.all([
      prisma.waterLog.findMany({ where: { userId, loggedAt: range } }),
      prisma.activityLog.findMany({ where: { userId, loggedAt: range } }),
      prisma.readingLog.findMany({ where: { userId, loggedAt: range } }),
      prisma.englishLog.findMany({ where: { userId, loggedAt: range } }),
      prisma.weightLog.findMany({ where: { userId, loggedAt: range } }),
      prisma.groupTaskLog.findMany({ where: { userId, loggedAt: range }, include: { task: true } }),
    ])

    const entries: TimelineEntry[] = [
      ...water.map((l): TimelineEntry => ({ id: l.id, type: 'water', loggedAt: l.loggedAt.toISOString(), amountMl: l.amountMl })),
      ...activity.map((l): TimelineEntry => ({ id: l.id, type: 'activity', loggedAt: l.loggedAt.toISOString(), durationMinutes: l.durationMinutes, description: l.description })),
      ...reading.map((l): TimelineEntry => ({ id: l.id, type: 'reading', loggedAt: l.loggedAt.toISOString(), durationMinutes: l.durationMinutes })),
      ...english.map((l): TimelineEntry => ({ id: l.id, type: 'english', loggedAt: l.loggedAt.toISOString(), durationMinutes: l.durationMinutes })),
      ...weight.map((l): TimelineEntry => ({ id: l.id, type: 'weight', loggedAt: l.loggedAt.toISOString(), weight: l.weight, isOfficial: l.isOfficial })),
      ...groupTasks.map((l): TimelineEntry => ({ id: l.id, type: 'groupTask', loggedAt: l.loggedAt.toISOString(), title: l.task.title, color: l.task.color, pointValue: l.task.pointValue })),
    ].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())

    const requestedDateStr = toLocalDateStr(requested)

    return {
      date: requestedDateStr,
      isToday: requestedDateStr === toLocalDateStr(new Date()),
      totals: {
        water: water.reduce((s, l) => s + l.amountMl, 0),
        activityMinutes: activity.reduce((s, l) => s + l.durationMinutes, 0),
        readingMinutes: reading.reduce((s, l) => s + l.durationMinutes, 0),
        englishMinutes: english.reduce((s, l) => s + (l.durationMinutes ?? 0), 0),
        groupTasksCompleted: groupTasks.length,
      },
      entries,
    }
  })
}
