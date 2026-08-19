import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'

const MOCK_EMAIL_TOKEN = 'mock-email-session-token'
const MOCK_GOOGLE_TOKEN = 'mock-google-session-token'

const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

function getToken(request: Request) {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
}

export const handlers = [
  http.get('*/api/health', async () => {
    await delay(300)

    return HttpResponse.json({
      status: 'ok',
      mode: 'mock',
    })
  }),
  http.post('*/api/auth/login', async ({ request }) => {
    await delay(600)

    const result = loginRequestSchema.safeParse(await request.json())

    if (!result.success) {
      return HttpResponse.json(
        { message: 'メールアドレスまたはパスワードが正しくありません。' },
        { status: 401 },
      )
    }

    const name = result.data.email.split('@')[0]

    return HttpResponse.json({
      token: MOCK_EMAIL_TOKEN,
      user: {
        id: 'mock-email-user',
        name,
        email: result.data.email,
        avatarUrl: null,
      },
    })
  }),
  http.post('*/api/auth/google', async () => {
    await delay(600)

    return HttpResponse.json({
      token: MOCK_GOOGLE_TOKEN,
      user: {
        id: 'mock-google-user',
        name: 'Google User',
        email: 'google.user@example.com',
        avatarUrl: null,
      },
    })
  }),
  http.get('*/api/auth/session', async ({ request }) => {
    await delay(250)

    const token = getToken(request)

    if (token === MOCK_EMAIL_TOKEN) {
      return HttpResponse.json({
        id: 'mock-email-user',
        name: 'Mock User',
        email: 'mock.user@example.com',
        avatarUrl: null,
      })
    }

    if (token === MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({
        id: 'mock-google-user',
        name: 'Google User',
        email: 'google.user@example.com',
        avatarUrl: null,
      })
    }

    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }),
  http.post('*/api/auth/logout', async () => {
    await delay(200)

    return new HttpResponse(null, { status: 204 })
  }),
]
