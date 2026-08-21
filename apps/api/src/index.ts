import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'

import { auth } from './auth'
import { db } from './db'
import { sessionMiddleware, type AuthEnv } from './middleware/auth'
import { profiles } from './routes/profiles'
import { content } from './routes/content'
import { uploads } from './routes/uploads'
import { getApiEnv } from './config/env'
import { creatorPosts } from './routes/creator-posts'
import { publisher } from './routes/publisher'
import { visits } from './routes/visits'
import { admin } from './routes/admin'

getApiEnv()

const app = new Hono<AuthEnv>()

app.use(
  '/api/*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  }),
)

app.all('/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/api/health', (c) => c.json({ status: 'ok', mode: 'api' }))
app.get('/api/ready', async (c) => {
  await db.run(sql`select 1`)
  return c.json({ status: 'ready' })
})

// Register application API routes below this middleware.
// Public routes receive a nullable session; protected routes should also use
// requireAuth or requirePublisher.
app.use('/api/*', sessionMiddleware)
app.route('/api', profiles)
app.route('/api', content)
app.route('/api', uploads)
app.route('/api', creatorPosts)
app.route('/api', publisher)
app.route('/api', visits)
app.route('/api', admin)

app.get('/', (c) => {
  return c.text('Scrozoo API')
})

app.onError((error, c) => {
  console.error(error)
  return c.json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '予期しないエラーが発生しました',
    },
  }, 500)
})

export default app
