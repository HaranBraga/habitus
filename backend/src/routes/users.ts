import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../server'

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
    const user = await prisma.user.findUnique({
      where: { id },
      include: { settings: true },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return user
  })

  app.post('/', async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const { name, phone, height } = parsed.data

    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) return reply.status(409).send({ error: 'Telefone já cadastrado' })

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        height,
        settings: { create: {} },
      },
      include: { settings: true },
    })
    return reply.status(201).send(user)
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const schema = z.object({
      name: z.string().min(2).optional(),
      height: z.number().min(100).max(250).optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
    })
    return user
  })
}
