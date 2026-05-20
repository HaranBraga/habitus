import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'

// Water goal: 35ml per kg of body weight, rounded to nearest 100ml
function calcWaterGoal(weightKg: number): number {
  return Math.round((weightKg * 35) / 100) * 100
}

// Ideal weight range based on height and healthy BMI (18.5–24.9, target 22)
export function calcWeightGoal(heightCm: number): { min: number; ideal: number; max: number } {
  const h = heightCm / 100
  return {
    min: parseFloat((18.5 * h * h).toFixed(1)),
    ideal: parseFloat((22 * h * h).toFixed(1)),
    max: parseFloat((24.9 * h * h).toFixed(1)),
  }
}

export async function weightRoutes(app: FastifyInstance) {
  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({ weight: z.number().min(20).max(300) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { weight } = parsed.data

    const [log] = await Promise.all([
      prisma.weightLog.create({ data: { userId, weight } }),
      // Auto-update water goal based on new weight
      prisma.userSettings.upsert({
        where: { userId },
        update: { waterGoalMl: calcWaterGoal(weight) },
        create: { userId, waterGoalMl: calcWaterGoal(weight) },
      }),
    ])

    return reply.status(201).send({ ...log, newWaterGoal: calcWaterGoal(weight) })
  })

  app.get('/:userId/latest', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } })
  })

  app.get('/:userId/history', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.weightLog.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 30 })
  })

  app.get('/:userId/goal', async (req) => {
    const { userId } = req.params as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return {}
    return calcWeightGoal(user.height)
  })

  app.get('/:userId/due', async (req) => {
    const { userId } = req.params as { userId: string }
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    const intervalDays = settings?.weightCheckIntervalDays ?? 7
    const latest = await prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } })
    if (!latest) return { due: true, daysAgo: null }
    const daysAgo = Math.floor((Date.now() - latest.loggedAt.getTime()) / 86400000)
    return { due: daysAgo >= intervalDays, daysAgo, lastWeight: latest.weight }
  })
}
