import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { startOfDay, endOfDay } from '../utils/date'

export async function groupTasksRoutes(app: FastifyInstance) {
  // All group tasks (with today's completion status per user)
  app.get('/today/:userId', async (req) => {
    const { userId } = req.params as { userId: string }
    const now = new Date()
    const tasks = await prisma.groupTask.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    })
    const todayLogs = await prisma.groupTaskLog.findMany({
      where: { userId, loggedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
    })
    const completedIds = new Set(todayLogs.map(l => l.taskId))
    return tasks.map(t => ({ ...t, completedToday: completedIds.has(t.id) }))
  })

  // All tasks (admin view)
  app.get('/', async () => {
    return prisma.groupTask.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } })
  })

  // Create task — only admin
  app.post('/', async (req, reply) => {
    const schema = z.object({
      adminId: z.string(),
      title: z.string().min(2).max(60),
      description: z.string().max(200).optional(),
      pointValue: z.number().min(5).max(100).default(10),
      color: z.string().default('#7c5cfc'),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const admin = await prisma.user.findUnique({ where: { id: parsed.data.adminId } })
    if (!admin?.isAdmin) return reply.status(403).send({ error: 'Apenas o criador do grupo pode criar tarefas' })

    const { adminId: _adminId, ...taskData } = parsed.data
    return reply.status(201).send(await prisma.groupTask.create({ data: taskData }))
  })

  // Update task — only admin
  app.put('/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string }
    const schema = z.object({
      adminId: z.string(),
      title: z.string().min(2).max(60).optional(),
      description: z.string().max(200).optional(),
      pointValue: z.number().min(5).max(100).optional(),
      color: z.string().optional(),
      active: z.boolean().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const admin = await prisma.user.findUnique({ where: { id: parsed.data.adminId } })
    if (!admin?.isAdmin) return reply.status(403).send({ error: 'Apenas o criador do grupo pode editar tarefas' })

    const { adminId: _adminId, ...taskData } = parsed.data
    return prisma.groupTask.update({ where: { id: taskId }, data: taskData })
  })

  // Delete task — only admin
  app.delete('/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string }
    const { adminId } = req.query as { adminId: string }
    const admin = await prisma.user.findUnique({ where: { id: adminId } })
    if (!admin?.isAdmin) return reply.status(403).send({ error: 'Apenas o criador do grupo pode remover tarefas' })

    await prisma.groupTask.update({ where: { id: taskId }, data: { active: false } })
    return reply.status(204).send()
  })

  // Complete a task (any user)
  app.post('/:taskId/complete', async (req, reply) => {
    const { taskId } = req.params as { taskId: string }
    const schema = z.object({ userId: z.string() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { userId } = parsed.data
    const now = new Date()

    const existing = await prisma.groupTaskLog.findFirst({
      where: { taskId, userId, loggedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
    })
    if (existing) return reply.status(409).send({ error: 'Já concluída hoje' })

    return reply.status(201).send(
      await prisma.groupTaskLog.create({ data: { taskId, userId, loggedAt: new Date() } })
    )
  })

  // Undo a completion (any user, own log)
  app.delete('/log/:logId', async (req, reply) => {
    const { logId } = req.params as { logId: string }
    await prisma.groupTaskLog.delete({ where: { id: logId } })
    return reply.status(204).send()
  })
}
