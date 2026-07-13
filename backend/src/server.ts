process.env.TZ = 'America/Rio_Branco'

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
import { groupTasksRoutes } from './routes/grouptasks'
import { rankingRoutes } from './routes/ranking'
import { analysisRoutes } from './routes/analysis'
import { pushRoutes } from './routes/push'
import { timelineRoutes } from './routes/timeline'
import { startScheduler } from './services/scheduler'
import { initWebPush } from './services/webpush'

export const prisma = new PrismaClient()

const app = Fastify({
  logger: process.env.NODE_ENV === 'production' ? { level: 'warn' } : true,
})

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
  app.register(groupTasksRoutes, { prefix: '/api/grouptasks' })
  app.register(rankingRoutes, { prefix: '/api/ranking' })
  app.register(analysisRoutes, { prefix: '/api/analysis' })
  app.register(pushRoutes, { prefix: '/api/push' })
  app.register(timelineRoutes, { prefix: '/api/timeline' })

  app.get('/health', async () => ({ status: 'ok' }))

  initWebPush()
  startScheduler()

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Habitus backend rodando na porta ${port}`)
}

main().catch(err => { console.error(err); process.exit(1) })
