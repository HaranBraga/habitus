import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { startOfDay, endOfDay } from '../utils/date'

export async function tasksRoutes(app: FastifyInstance) {
  app.get('/:userId', async (req) => {
    const { userId } = req.params as { userId: string }
    return prisma.customTask.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  app.post('/:userId', async (req, reply) => {
    const { userId } = req.params as { userId: string }
    const schema = z.object({
      title: z.string().min(2).max(60),
      description: z.string().max(200).optional(),
      pointValue: z.number().min(5).max(100).default(10),
      color: z.string().default('#7c5cfc'),
      icon: z.string().default('star'),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    return reply.status(201).send(
      await prisma.customTask.create({ data: { userId, ...parsed.data } })
    )
  })

  app.put('/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string }
    const schema = z.object({
      title: z.string().min(2).max(60).optional(),
      description: z.string().max(200).optional(),
      pointValue: z.number().min(5).max(100).optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
      active: z.boolean().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    return prisma.customTask.update({ where: { id: taskId }, data: parsed.data })
  })

  app.delete('/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string }
    await prisma.customTask.update({ where: { id: taskId }, data: { active: false } })
    return reply.status(204).send()
  })

  app.post('/:taskId/log', async (req, reply) => {
    const { taskId } = req.params as { taskId: string }
    const task = await prisma.customTask.findUnique({ where: { id: taskId } })
    if (!task) return reply.status(404).send({ error: 'Tarefa não encontrada' })

    const now = new Date()
    const existing = await prisma.customTaskLog.findFirst({
      where: {
        taskId,
        userId: task.userId,
        loggedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    })
    if (existing) return reply.status(409).send({ error: 'Já registrado hoje' })

    return reply.status(201).send(
      await prisma.customTaskLog.create({ data: { taskId, userId: task.userId } })
    )
  })

  app.get('/:userId/today', async (req) => {
    const { userId } = req.params as { userId: string }
    const now = new Date()
    const tasks = await prisma.customTask.findMany({ where: { userId, active: true } })
    const logs = await prisma.customTaskLog.findMany({
      where: { userId, loggedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
    })
    const completedIds = new Set(logs.map((l) => l.taskId))
    return tasks.map((t) => ({ ...t, completedToday: completedIds.has(t.id) }))
  })
}
