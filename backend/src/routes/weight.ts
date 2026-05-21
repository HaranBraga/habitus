import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'

// Water goal: ml/kg varies by age, rounded to nearest 100ml
export function calcWaterGoal(weightKg: number, age: number): number {
  const mlPerKg = age < 18 ? 40 : age <= 55 ? 35 : age <= 65 ? 30 : 25
  return Math.round((weightKg * mlPerKg) / 100) * 100
}

// Ideal weight range based on height (BMI 18.5–24.9, target 22)
export function calcWeightGoal(heightCm: number): { min: number; ideal: number; max: number } {
  const h = heightCm / 100
  return {
    min: parseFloat((18.5 * h * h).toFixed(1)),
    ideal: parseFloat((22 * h * h).toFixed(1)),
    max: parseFloat((24.9 * h * h).toFixed(1)),
  }
}

// Points for an official weight based on evolution toward ideal
export function calcWeightPoints(
  currentWeight: number,
  previousOfficialWeight: number | null,
  idealWeight: number
): { points: number; reason: string } {
  // Base points for logging on time
  let points = 15
  let reason = 'Peso oficial registrado'

  if (previousOfficialWeight === null) {
    return { points, reason: 'Primeiro registro oficial' }
  }

  const prevDistToIdeal = Math.abs(previousOfficialWeight - idealWeight)
  const currDistToIdeal = Math.abs(currentWeight - idealWeight)
  const improvement = prevDistToIdeal - currDistToIdeal

  if (improvement > 0.2) {
    // Moving toward ideal — bonus based on improvement
    const bonus = Math.min(20, Math.round(improvement * 10))
    points += bonus
    reason = `Evoluindo para o ideal (+${bonus}pts bônus)`
  } else if (Math.abs(currentWeight - previousOfficialWeight) <= 0.3) {
    // Maintaining
    points += 5
    reason = 'Mantendo o peso (+5pts bônus)'
  } else if (improvement < -0.2) {
    // Moving away from ideal
    reason = 'Afastando do ideal (sem bônus)'
  }

  return { points, reason }
}

export async function weightRoutes(app: FastifyInstance) {
  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({ weight: z.number().min(20).max(300) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { weight } = parsed.data

    const [user, settings, lastOfficial] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.weightLog.findFirst({
        where: { userId, isOfficial: true },
        orderBy: { loggedAt: 'desc' },
      }),
    ])

    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const intervalDays = settings?.weightCheckIntervalDays ?? 7
    const daysAgoLastOfficial = lastOfficial
      ? Math.floor((Date.now() - lastOfficial.loggedAt.getTime()) / 86400000)
      : intervalDays + 1

    // Mark as official if first weight or interval has passed
    const isOfficial = daysAgoLastOfficial >= intervalDays

    // Auto-update water goal based on new weight and age
    const newWaterGoal = calcWaterGoal(weight, user.age)
    await prisma.userSettings.upsert({
      where: { userId },
      update: { waterGoalMl: newWaterGoal },
      create: { userId, waterGoalMl: newWaterGoal },
    })

    const log = await prisma.weightLog.create({
      data: { userId, weight, isOfficial },
    })

    const goal = calcWeightGoal(user.height)
    const weightPts = isOfficial
      ? calcWeightPoints(weight, lastOfficial?.weight ?? null, goal.ideal)
      : null

    return reply.status(201).send({
      ...log,
      isOfficial,
      newWaterGoal,
      weightPoints: weightPts,
      nextOfficialIn: isOfficial ? intervalDays : intervalDays - daysAgoLastOfficial,
    })
  })

  app.get('/:userId/history', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.weightLog.findMany({ where: { userId }, orderBy: { loggedAt: 'desc' }, take: 50 })
  })

  app.get('/:userId/official', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.weightLog.findMany({
      where: { userId, isOfficial: true },
      orderBy: { loggedAt: 'desc' },
      take: 20,
    })
  })

  app.get('/:userId/goal', async (req) => {
    const { userId } = req.params as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return {}
    return calcWeightGoal(user.height)
  })

  app.get('/:userId/status', async (req) => {
    const { userId } = req.params as { userId: string }
    const [user, settings, latest, lastOfficial] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.weightLog.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } }),
      prisma.weightLog.findFirst({ where: { userId, isOfficial: true }, orderBy: { loggedAt: 'desc' } }),
    ])

    const intervalDays = settings?.weightCheckIntervalDays ?? 7
    const daysAgo = lastOfficial
      ? Math.floor((Date.now() - lastOfficial.loggedAt.getTime()) / 86400000)
      : null
    const due = daysAgo === null || daysAgo >= intervalDays
    const systemGoal = user ? calcWeightGoal(user.height) : null

    return {
      latest: latest?.weight ?? null,
      latestAt: latest?.loggedAt ?? null,
      lastOfficial: lastOfficial?.weight ?? null,
      lastOfficialAt: lastOfficial?.loggedAt ?? null,
      due,
      daysAgo,
      daysUntilNext: daysAgo !== null ? Math.max(0, intervalDays - daysAgo) : 0,
      intervalDays,
      goal: systemGoal,
      personalGoalKg: settings?.weightGoalKg ?? null,
    }
  })
}
