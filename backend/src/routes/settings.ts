import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    if (!settings) return reply.status(404).send({ error: 'Settings não encontradas' })
    return settings
  })

  app.put('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({
      waterGoalMl: z.number().min(500).max(5000).optional(),
      waterReminderIntervalHours: z.number().min(1).max(12).optional(),
      weightCheckIntervalDays: z.number().min(1).max(30).optional(),
      activityGoalMinutes: z.number().min(5).max(240).optional(),
      readingGoalMinutes: z.number().min(5).max(240).optional(),
      englishGoalMinutes: z.number().min(5).max(120).optional(),
      weightGoalKg: z.number().min(30).max(250).nullable().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: parsed.data,
      create: { userId, ...parsed.data },
    })
    return settings
  })

  // Update profile (name, height, age)
  app.put('/:userId/profile', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({
      name: z.string().min(2).max(60).optional(),
      height: z.number().min(100).max(250).optional(),
      age: z.number().min(10).max(100).optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    return prisma.user.update({ where: { id: userId }, data: parsed.data })
  })
}
