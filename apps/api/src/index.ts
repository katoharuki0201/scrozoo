import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { auth } from './auth'

const app = new Hono()

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

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
