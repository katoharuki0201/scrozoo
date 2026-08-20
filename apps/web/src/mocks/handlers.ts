import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'

const MOCK_EMAIL_TOKEN = 'mock-email-session-token'
const MOCK_GOOGLE_TOKEN = 'mock-google-session-token'

let likedVideoIds = new Set<string>()

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
        plan: 'free',
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
        plan: 'free',
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
        plan: 'free',
      })
    }

    if (token === MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({
        id: 'mock-google-user',
        name: 'Google User',
        email: 'google.user@example.com',
        avatarUrl: null,
        plan: 'free',
      })
    }

    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }),
  http.post('*/api/auth/logout', async () => {
    await delay(200)

    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/api/feed', async () => {
    await delay(350)

    const videos = [
      {
        id: 'kangaroo-snow',
        videoUrl: '/videos/14634386_1080_1920_30fps.mp4',
        zoo: { id: 'tama', name: '多摩動物公園', avatarUrl: '/icon.jpg' },
        caption: '雪の日も元気いっぱい。親子で過ごすカンガルーたちの朝',
        tags: ['カンガルー', '雪の動物園', '多摩動物公園'],
        likeCount: 102,
        commentCount: 31,
        supportPrice: 500,
      },
      {
        id: 'tiger-walk',
        videoUrl: '/videos/14807282_2160_3840_30fps.mp4',
        zoo: { id: 'higashiyama', name: '東山動植物園', avatarUrl: '/icon.jpg' },
        caption: 'ゆっくりと園内をお散歩中。迫力たっぷりなトラの横顔に注目',
        tags: ['トラ', '東山動植物園', '動物の日常'],
        likeCount: 284,
        commentCount: 48,
        supportPrice: 500,
      },
      {
        id: 'giraffe-herd',
        videoUrl: '/videos/15039194_2160_3840_30fps.mp4',
        zoo: { id: 'ueno', name: '上野動物園', avatarUrl: '/icon.jpg' },
        caption: 'みんなで並んでお散歩。青空の下で過ごすキリンたちの日常',
        tags: ['キリン', '上野動物園', '動物の日常'],
        likeCount: 196,
        commentCount: 22,
        supportPrice: 300,
      },
    ]

    return HttpResponse.json(
      videos.map((video) => ({
        ...video,
        isLiked: likedVideoIds.has(video.id),
        likeCount: video.likeCount + (likedVideoIds.has(video.id) ? 1 : 0),
      })),
    )
  }),
  http.post('*/api/feed/:videoId/like', async ({ params }) => {
    await delay(180)

    const videoId = String(params.videoId)
    const isLiked = !likedVideoIds.has(videoId)

    if (isLiked) {
      likedVideoIds.add(videoId)
    } else {
      likedVideoIds.delete(videoId)
    }

    return HttpResponse.json({ isLiked })
  }),
]
