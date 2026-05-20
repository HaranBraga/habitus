import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'
import { calcWeightGoal } from './weight'

const createUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  height: z.number().min(100).max(250),
})

export async function usersRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return prisma.user.findMany({
      include: { settings: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUnique({ where: { id }, include: { settings: true } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    const weightGoal = calcWeightGoal(user.height)
    return { ...user, weightGoal }
  })

  app.post('/', async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { name, phone, height } = parsed.data

    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) return reply.status(409).send({ error: 'Telefone já cadastrado' })

    // First user registered becomes admin
    const count = await prisma.user.count()
    const isAdmin = count === 0

    // Water goal: 35ml/kg, use 70kg as default (updated when weight is logged)
    const waterGoalMl = Math.round((70 * 35) / 100) * 100

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        height,
        isAdmin,
        settings: { create: { waterGoalMl } },
      },
      include: { settings: true },
    })

    const weightGoal = calcWeightGoal(height)
    return reply.status(201).send({ ...user, weightGoal })
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const schema = z.object({
      name: z.string().min(2).optional(),
      height: z.number().min(100).max(250).optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    return prisma.user.update({ where: { id }, data: parsed.data })
  })
}
