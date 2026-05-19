import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { usersRoutes } from './routes/users'
import { waterRoutes } from './routes/water'
import { weightRoutes } from './routes/weight'
import { activityRoutes } from './routes/activity'
import { readingRoutes } from './routes/reading'
import { englishRoutes } from './routes/english'
import { dashboardRoutes } from './routes/dashboard'
import { settingsRoutes } from './routes/settings'
import { tasksRoutes } from './routes/tasks'
import { rankingRoutes } from './routes/ranking'
import { analysisRoutes } from './routes/analysis'
import { startScheduler } from './services/scheduler'

export const prisma = new PrismaClient()

const app = Fastify({ logger: true })

async function main() {
  await app.register(cors, {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })

  app.register(usersRoutes, { prefix: '/api/users' })
  app.register(waterRoutes, { prefix: '/api/water' })
  app.register(weightRoutes, { prefix: '/api/weight' })
  app.register(activityRoutes, { prefix: '/api/activity' })
  app.register(readingRoutes, { prefix: '/api/reading' })
  app.register(englishRoutes, { prefix: '/api/english' })
  app.register(dashboardRoutes, { prefix: '/api/dashboard' })
  app.register(settingsRoutes, { prefix: '/api/settings' })
  app.register(tasksRoutes, { prefix: '/api/tasks' })
  app.register(rankingRoutes, { prefix: '/api/ranking' })
  app.register(analysisRoutes, { prefix: '/api/analysis' })

  app.get('/health', async () => ({ status: 'ok' }))

  startScheduler()

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Habitus backend rodando na porta ${port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
