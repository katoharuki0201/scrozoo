import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { auth } from './auth'
import { sessionMiddleware, type AuthEnv } from './middleware/auth'

const app = new Hono<AuthEnv>()

app.use(
  '/api/auth/*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
  }),
)

app.all('/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Register application API routes below this middleware.
// Public routes receive a nullable session; protected routes should also use
// requireAuth or requirePublisher.
app.use('/api/*', sessionMiddleware)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
