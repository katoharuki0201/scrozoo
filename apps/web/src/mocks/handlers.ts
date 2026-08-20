import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'

const MOCK_EMAIL_TOKEN = 'mock-email-session-token'
const MOCK_GOOGLE_TOKEN = 'mock-google-session-token'

let likedVideoIds = new Set<string>([
  'kangaroo-snow',
  'tiger-closeup',
  'giraffe-herd',
  'tiger-patrol',
  'giraffe-sky',
])

const supportedZooIds = new Set(['higashiyama'])
let mockSupportPlans = [
  {
    id: 'support-plan-higashiyama',
    zoo: {
      id: 'higashiyama',
      name: '東山動植物園',
      avatarUrl: '/icon.jpg',
    },
    nextRenewalDate: '2026-09-20',
    status: 'active' as 'active' | 'cancel_scheduled',
  },
]

type MockSupportGoal = {
  id: string
  zooId: string
  title: string
  targetAmount: number
  currentAmount: number
  deadline: string
}

const supportGoalsByZoo = new Map<string, MockSupportGoal>([
  ['tama', {
    id: 'support-goal-tama',
    zooId: 'tama',
    title: 'カンガルー舎に新しい日よけを設置したい',
    targetAmount: 100_000,
    currentAmount: 42_300,
    deadline: '2026-09-30',
  }],
])

function toSupportGoal(goal: MockSupportGoal | undefined) {
  if (!goal) return null

  const expired = new Date(`${goal.deadline}T23:59:59`).getTime() < Date.now()
  const status = expired
    ? 'expired'
    : goal.currentAmount >= goal.targetAmount
      ? 'achieved'
      : 'active'

  return { ...goal, status }
}

function addSupportGoalAmount(zooId: string, amount: number) {
  const goal = supportGoalsByZoo.get(zooId)

  if (!goal || toSupportGoal(goal)?.status === 'expired') return

  goal.currentAmount += amount
}

const commentRequestSchema = z.object({
  message: z.string().trim().min(1).max(200),
  tipAmount: z.union([z.literal(0), z.literal(100), z.literal(300), z.literal(500)]),
})

const commentsByVideo = new Map<string, Array<Record<string, unknown>>>()

function getComments(videoId: string) {
  const existing = commentsByVideo.get(videoId)

  if (existing) return existing

  const comments = [
    {
      id: `${videoId}-supporter-1`,
      author: { name: 'kuma_maru', initials: 'KM' },
      message: 'かわいい！ずっと見ていられます。これからも応援しています！',
      isSupporter: true,
      tipAmount: 500,
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    },
    {
      id: `${videoId}-regular-1`,
      author: { name: 'aozora', initials: 'AO' },
      message: '今度のお休みに会いに行きたいです。',
      isSupporter: false,
      tipAmount: 0,
      createdAt: new Date(Date.now() - 120_000).toISOString(),
    },
    {
      id: `${videoId}-supporter-2`,
      author: { name: 'animal_fan', initials: 'AF' },
      message: '今日も素敵な動画をありがとうございます。',
      isSupporter: true,
      tipAmount: 300,
      createdAt: new Date(Date.now() - 180_000).toISOString(),
    },
  ]

  commentsByVideo.set(videoId, comments)

  return comments
}

const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

const accountInformationRequestSchema = z.object({
  name: z.string().trim().min(1).max(30),
  email: z.email(),
  bio: z.string().trim().max(200),
})

const qrVerificationRequestSchema = z.object({
  payload: z.string(),
})

const galleryPostRequestSchema = z.object({
  sessionId: z.string(),
  imageDataUrl: z.string().startsWith('data:image/'),
})

const supportGoalRequestSchema = z.object({
  title: z.string().trim().min(1).max(50),
  targetAmount: z.number().int().min(500),
  deadline: z.string(),
})

const createSupportPlanRequestSchema = z.object({
  zooId: z.string(),
})

const defaultBio = '【動物動画の鑑賞垢】動物たちの可愛い姿や面白いハプニング動画を見て日々癒やされています。もふもふ系の動画に無言いいね多めです。素敵な投稿いつもありがとうございます！'

const accountByToken = new Map<string, { name: string; email: string; bio: string; role: 'viewer' | 'creator' }>([
  [MOCK_EMAIL_TOKEN, { name: 'Mock User', email: 'mock.user@example.com', bio: defaultBio, role: 'viewer' }],
  [MOCK_GOOGLE_TOKEN, { name: 'Google User', email: 'google.user@example.com', bio: defaultBio, role: 'viewer' }],
])

function getToken(request: Request) {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
}

const mockVideos = [
  {
    id: 'kangaroo-snow',
    videoUrl: '/videos/14634386_1080_1920_30fps.mp4',
    zoo: { id: 'tama', name: '多摩動物公園', avatarUrl: '/icon.jpg' },
    caption: '雪の日も元気いっぱい。親子で過ごすカンガルーたちの朝',
    tags: ['カンガルー', '雪の動物園', '多摩動物公園'],
    likeCount: 102,
    commentCount: 31,
    supportPrice: 500,
    viewCount: 1246,
    thumbnailTime: 0.5,
    publishedAt: '2026-08-18T09:00:00.000Z',
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
    viewCount: 8214,
    thumbnailTime: 1.2,
    publishedAt: '2026-08-16T11:30:00.000Z',
  },
  {
    id: 'giraffe-herd',
    videoUrl: '/videos/15039194_2160_3840_30fps.mp4',
    zoo: { id: 'ueno', name: '上野動物園', avatarUrl: '/icon.jpg' },
    caption: 'みんなで並んでお散歩。青空の下で過ごすキリンたちの日常',
    tags: ['キリン', '上野動物園', '動物の日常'],
    likeCount: 196,
    commentCount: 22,
    supportPrice: 500,
    viewCount: 4680,
    thumbnailTime: 2,
    publishedAt: '2026-08-14T08:15:00.000Z',
  },
  {
    id: 'kangaroo-family',
    videoUrl: '/videos/14634386_1080_1920_30fps.mp4',
    zoo: { id: 'tama', name: '多摩動物公園', avatarUrl: '/icon.jpg' },
    caption: 'カンガルー家族ののんびりした午後',
    tags: ['カンガルー', '親子', '多摩動物公園'],
    likeCount: 88,
    commentCount: 14,
    supportPrice: 500,
    viewCount: 980,
    thumbnailTime: 2.4,
    publishedAt: '2026-08-12T13:00:00.000Z',
  },
  {
    id: 'tiger-closeup',
    videoUrl: '/videos/14807282_2160_3840_30fps.mp4',
    zoo: { id: 'higashiyama', name: '東山動植物園', avatarUrl: '/icon.jpg' },
    caption: 'すぐそばまでやってきたトラの迫力ある表情',
    tags: ['トラ', '肉食動物', '東山動植物園'],
    likeCount: 341,
    commentCount: 56,
    supportPrice: 500,
    viewCount: 12560,
    thumbnailTime: 3.1,
    publishedAt: '2026-08-10T10:20:00.000Z',
  },
  {
    id: 'giraffe-sky',
    videoUrl: '/videos/15039194_2160_3840_30fps.mp4',
    zoo: { id: 'ueno', name: '上野動物園', avatarUrl: '/icon.jpg' },
    caption: '真夏の青空とキリンのシルエット',
    tags: ['キリン', '夏', '上野動物園'],
    likeCount: 153,
    commentCount: 19,
    supportPrice: 500,
    viewCount: 3921,
    thumbnailTime: 4,
    publishedAt: '2026-08-08T15:40:00.000Z',
  },
  {
    id: 'kangaroo-morning',
    videoUrl: '/videos/14634386_1080_1920_30fps.mp4',
    zoo: { id: 'tama', name: '多摩動物公園', avatarUrl: '/icon.jpg' },
    caption: '朝のカンガルー舎からおはよう',
    tags: ['カンガルー', '朝', '多摩動物公園'],
    likeCount: 67,
    commentCount: 9,
    supportPrice: 500,
    viewCount: 746,
    thumbnailTime: 3.6,
    publishedAt: '2026-08-06T07:10:00.000Z',
  },
  {
    id: 'tiger-patrol',
    videoUrl: '/videos/14807282_2160_3840_30fps.mp4',
    zoo: { id: 'higashiyama', name: '東山動植物園', avatarUrl: '/icon.jpg' },
    caption: 'いつものコースをパトロールするトラ',
    tags: ['トラ', 'お散歩', '東山動植物園'],
    likeCount: 229,
    commentCount: 35,
    supportPrice: 500,
    viewCount: 6775,
    thumbnailTime: 4.3,
    publishedAt: '2026-08-04T12:00:00.000Z',
  },
  {
    id: 'giraffe-together',
    videoUrl: '/videos/15039194_2160_3840_30fps.mp4',
    zoo: { id: 'ueno', name: '上野動物園', avatarUrl: '/icon.jpg' },
    caption: 'なかよく並んで歩くキリンたち',
    tags: ['キリン', '仲間', '上野動物園'],
    likeCount: 177,
    commentCount: 27,
    supportPrice: 500,
    viewCount: 5132,
    thumbnailTime: 1,
    publishedAt: '2026-08-02T09:50:00.000Z',
  },
]

const zooProfileDetails: Record<string, { bio: string; supporterCount: number; videoCount: number }> = {
  tama: {
    bio: '【多摩動物公園 公式】豊かな自然の中で個性あふれる動物たちと出会える場所。園内の最新情報や動物たちのほっこりする日常動画をお届けします！',
    supporterCount: 38,
    videoCount: 41,
  },
  higashiyama: {
    bio: '【東山動植物園 公式】たくさんの動物たちと出会える緑豊かな動物園です。飼育員だからこそ見られる、動物たちの自然な表情を毎日お届けします！',
    supporterCount: 24,
    videoCount: 52,
  },
  ueno: {
    bio: '【上野動物園 公式】動物たちの魅力と、いのちの大切さを伝える動物園。個性豊かな仲間たちの今を動画でお届けします。',
    supporterCount: 52,
    videoCount: 67,
  },
}

function toProfileVideo(video: (typeof mockVideos)[number]) {
  return {
    id: video.id,
    videoId: video.id,
    videoUrl: video.videoUrl,
    title: video.caption,
    viewCount: video.viewCount,
    thumbnailTime: video.thumbnailTime,
  }
}

const mockGalleryPosts = [
  {
    id: 'gallery-penguins',
    imageUrl: '/gallery01.jpg',
    createdAt: '2026-08-19T11:30:00.000Z',
    author: { id: 'mock-google-user', name: 'Google User' },
    zoo: { id: 'higashiyama', name: '東山動植物園' },
  },
  {
    id: 'gallery-hippo',
    imageUrl: '/gallery02.jpg',
    createdAt: '2026-08-18T14:10:00.000Z',
    author: { id: 'mock-google-user', name: 'Google User' },
    zoo: { id: 'higashiyama', name: '東山動植物園' },
  },
  {
    id: 'gallery-monkeys',
    imageUrl: '/gallery03.jpg',
    createdAt: '2026-08-17T09:45:00.000Z',
    author: { id: 'mock-google-user', name: 'Google User' },
    zoo: { id: 'higashiyama', name: '東山動植物園' },
  },
]

const qrVisitSessions = new Map<
  string,
  {
    sessionId: string
    zoo: { id: string; name: string }
    expiresAt: string
    used: boolean
  }
>()

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

    const creatorLogin = result.data.email.toLowerCase() === 'creator@scrozoo.jp'
    const name = creatorLogin ? '多摩動物公園' : result.data.email.split('@')[0]
    const role = creatorLogin ? 'creator' as const : 'viewer' as const
    accountByToken.set(MOCK_EMAIL_TOKEN, {
      name,
      email: result.data.email,
      bio: creatorLogin
        ? zooProfileDetails.tama.bio
        : accountByToken.get(MOCK_EMAIL_TOKEN)?.bio ?? defaultBio,
      role,
    })

    return HttpResponse.json({
      token: MOCK_EMAIL_TOKEN,
      user: {
        id: 'mock-email-user',
        name,
        email: result.data.email,
        avatarUrl: null,
        plan: 'free',
        role,
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
        role: 'viewer',
      },
    })
  }),
  http.get('*/api/auth/session', async ({ request }) => {
    await delay(250)

    const token = getToken(request)

    if (token === MOCK_EMAIL_TOKEN) {
      const account = accountByToken.get(MOCK_EMAIL_TOKEN)!

      return HttpResponse.json({
        id: 'mock-email-user',
        name: account.name,
        email: account.email,
        avatarUrl: null,
        plan: 'free',
        role: account.role,
      })
    }

    if (token === MOCK_GOOGLE_TOKEN) {
      const account = accountByToken.get(MOCK_GOOGLE_TOKEN)!

      return HttpResponse.json({
        id: 'mock-google-user',
        name: account.name,
        email: account.email,
        avatarUrl: null,
        plan: 'free',
        role: account.role,
      })
    }

    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }),
  http.post('*/api/auth/logout', async () => {
    await delay(200)

    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/api/qr/verify', async ({ request }) => {
    await delay(450)

    const token = getToken(request)
    const result = qrVerificationRequestSchema.safeParse(await request.json())

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!result.success || result.data.payload !== 'scrozoo:visit:higashiyama:demo-2026') {
      return HttpResponse.json({ message: 'Invalid QR code' }, { status: 400 })
    }

    const sessionId = crypto.randomUUID()
    const session = {
      sessionId,
      zoo: { id: 'higashiyama', name: '東山動植物園' },
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      used: false,
    }
    qrVisitSessions.set(sessionId, session)

    return HttpResponse.json({
      sessionId: session.sessionId,
      zoo: session.zoo,
      expiresAt: session.expiresAt,
    })
  }),
  http.get('*/api/qr/sessions/:sessionId', async ({ params, request }) => {
    await delay(250)

    const token = getToken(request)
    const session = qrVisitSessions.get(String(params.sessionId))

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!session || session.used || new Date(session.expiresAt).getTime() <= Date.now()) {
      return HttpResponse.json({ message: 'Visit session expired' }, { status: 404 })
    }

    return HttpResponse.json({
      sessionId: session.sessionId,
      zoo: session.zoo,
      expiresAt: session.expiresAt,
    })
  }),
  http.post('*/api/gallery/posts', async ({ request }) => {
    await delay(600)

    const token = getToken(request) ?? ''
    const account = accountByToken.get(token)
    const result = galleryPostRequestSchema.safeParse(await request.json())

    if (!account) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!result.success) {
      return HttpResponse.json({ message: 'Invalid image' }, { status: 400 })
    }

    const session = qrVisitSessions.get(result.data.sessionId)

    if (!session || session.used || new Date(session.expiresAt).getTime() <= Date.now()) {
      return HttpResponse.json({ message: 'Visit session expired' }, { status: 400 })
    }

    const post = {
      id: crypto.randomUUID(),
      imageUrl: result.data.imageDataUrl,
      createdAt: new Date().toISOString(),
      author: {
        id: token === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user',
        name: account.name,
      },
      zoo: session.zoo,
    }
    session.used = true
    mockGalleryPosts.unshift(post)

    return HttpResponse.json(post, { status: 201 })
  }),
  http.get('*/api/profiles/me/account', async ({ request }) => {
    await delay(250)

    const account = accountByToken.get(getToken(request) ?? '')

    if (!account) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json(account)
  }),
  http.patch('*/api/profiles/me/account', async ({ request }) => {
    await delay(450)

    const token = getToken(request) ?? ''

    if (!accountByToken.has(token)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const result = accountInformationRequestSchema.safeParse(await request.json())

    if (!result.success) {
      return HttpResponse.json(
        { message: '入力内容を確認してください。' },
        { status: 400 },
      )
    }

    const currentAccount = accountByToken.get(token)!
    accountByToken.set(token, { ...result.data, role: currentAccount.role })

    return HttpResponse.json(result.data)
  }),
  http.get('*/api/profiles/me/support-goal', async ({ request }) => {
    await delay(240)

    const account = accountByToken.get(getToken(request) ?? '')

    if (account?.role !== 'creator') {
      return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    return HttpResponse.json(toSupportGoal(supportGoalsByZoo.get('tama')))
  }),
  http.put('*/api/profiles/me/support-goal', async ({ request }) => {
    await delay(420)

    const account = accountByToken.get(getToken(request) ?? '')
    const result = supportGoalRequestSchema.safeParse(await request.json())

    if (account?.role !== 'creator') {
      return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!result.success || new Date(`${result.data.deadline}T23:59:59`).getTime() <= Date.now()) {
      return HttpResponse.json({ message: 'Invalid support goal' }, { status: 400 })
    }

    const currentGoal = supportGoalsByZoo.get('tama')
    const goal: MockSupportGoal = {
      id: currentGoal?.id ?? `support-goal-${Date.now()}`,
      zooId: 'tama',
      title: result.data.title,
      targetAmount: result.data.targetAmount,
      currentAmount: currentGoal?.currentAmount ?? 0,
      deadline: result.data.deadline,
    }
    supportGoalsByZoo.set('tama', goal)

    return HttpResponse.json(toSupportGoal(goal))
  }),
  http.delete('*/api/profiles/me/support-goal', async ({ request }) => {
    await delay(350)

    const account = accountByToken.get(getToken(request) ?? '')

    if (account?.role !== 'creator') {
      return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    supportGoalsByZoo.delete('tama')

    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/api/profiles/me/support-plans', async ({ request }) => {
    await delay(280)

    const token = getToken(request)

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json(mockSupportPlans)
  }),
  http.post('*/api/support-plans', async ({ request }) => {
    await delay(550)

    const token = getToken(request)
    const result = createSupportPlanRequestSchema.safeParse(await request.json())

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!result.success) {
      return HttpResponse.json({ message: 'Invalid zoo' }, { status: 400 })
    }

    const zoo = mockVideos.find((video) => video.zoo.id === result.data.zooId)?.zoo

    if (!zoo) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const existingPlan = mockSupportPlans.find((plan) => plan.zoo.id === zoo.id)

    if (existingPlan) {
      return HttpResponse.json(existingPlan)
    }

    const renewalDate = new Date()
    renewalDate.setMonth(renewalDate.getMonth() + 1)
    const plan = {
      id: `support-plan-${zoo.id}`,
      zoo,
      nextRenewalDate: renewalDate.toISOString().slice(0, 10),
      status: 'active' as const,
    }
    supportedZooIds.add(zoo.id)
    mockSupportPlans.push(plan)
    addSupportGoalAmount(zoo.id, 500)

    return HttpResponse.json(plan, { status: 201 })
  }),
  http.post('*/api/support-plans/:planId/cancel', async ({ params, request }) => {
    await delay(500)

    const token = getToken(request)

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const planId = String(params.planId)
    const plan = mockSupportPlans.find((item) => item.id === planId)

    if (!plan) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const cancelledPlan = { ...plan, status: 'cancel_scheduled' as const }
    mockSupportPlans = mockSupportPlans.map((item) =>
      item.id === planId ? cancelledPlan : item,
    )

    return HttpResponse.json(cancelledPlan)
  }),
  http.get('*/api/profiles/me', async ({ request }) => {
    await delay(280)

    const token = getToken(request)

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const account = accountByToken.get(token)!

    if (account.role === 'creator') {
      const zooId = 'tama'
      const videos = mockVideos.filter((video) => video.zoo.id === zooId)
      const details = zooProfileDetails[zooId]

      return HttpResponse.json({
        id: zooId,
        accountRole: 'creator',
        name: account.name,
        avatarUrl: videos[0].zoo.avatarUrl,
        bio: account.bio,
        videoCount: details.videoCount,
        supporterCount: details.supporterCount,
        supportPrice: 500,
        supportGoal: toSupportGoal(supportGoalsByZoo.get(zooId)),
        videos: videos.map((video) => toProfileVideo(video)),
        galleryPosts: mockGalleryPosts.filter((post) => post.zoo.id === zooId),
      })
    }

    return HttpResponse.json({
      id: token === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user',
      accountRole: 'viewer',
      name: account.name,
      avatarUrl: null,
      bio: account.bio,
      videoCount: null,
      supporterCount: null,
      supportPrice: null,
      supportGoal: null,
      videos: [],
      galleryPosts: mockGalleryPosts.map((post) => ({
        ...post,
        author: {
          id: token === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user',
          name: account.name,
        },
      })),
    })
  }),
  http.get('*/api/zoos/:zooId/profile', async ({ params }) => {
    await delay(300)

    const zooId = String(params.zooId)
    const videos = mockVideos.filter((video) => video.zoo.id === zooId)
    const details = zooProfileDetails[zooId]

    if (!details || videos.length === 0) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const zoo = videos[0].zoo

    return HttpResponse.json({
      id: zoo.id,
      accountRole: 'creator',
      name: zoo.name,
      avatarUrl: zoo.avatarUrl,
      bio: details.bio,
      videoCount: details.videoCount,
      supporterCount: details.supporterCount,
      supportPrice: videos[0].supportPrice,
      supportGoal: toSupportGoal(supportGoalsByZoo.get(zooId)),
      videos: videos.map((video) => toProfileVideo(video)),
      galleryPosts: mockGalleryPosts.filter((post) => post.zoo.id === zooId),
    })
  }),
  http.get('*/api/feed', async () => {
    await delay(350)

    return HttpResponse.json(
      mockVideos.map((video) => ({
        ...video,
        hasActiveSupportPlan: supportedZooIds.has(video.zoo.id),
        supportGoal: toSupportGoal(supportGoalsByZoo.get(video.zoo.id)),
        isLiked: likedVideoIds.has(video.id),
        likeCount: video.likeCount + (likedVideoIds.has(video.id) ? 1 : 0),
      })),
    )
  }),
  http.get('*/api/search/videos', async ({ request }) => {
    await delay(300)

    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim().toLocaleLowerCase('ja-JP') ?? ''
    const sort = url.searchParams.get('sort') ?? 'latest'
    const matches = mockVideos.filter((video) => {
      if (!query) return true

      return [video.caption, video.zoo.name, ...video.tags]
        .join(' ')
        .toLocaleLowerCase('ja-JP')
        .includes(query)
    })

    const sorted = matches.toSorted((first, second) => {
      if (sort === 'popular') return second.viewCount - first.viewCount
      if (sort === 'oldest') return first.publishedAt.localeCompare(second.publishedAt)

      return second.publishedAt.localeCompare(first.publishedAt)
    })

    return HttpResponse.json(
      sorted.map(({ id, videoUrl, caption, viewCount, thumbnailTime, publishedAt }) => ({
        id,
        videoUrl,
        title: caption,
        viewCount,
        thumbnailTime,
        publishedAt,
      })),
    )
  }),
  http.get('*/api/favorites', async ({ request }) => {
    await delay(300)

    const sort = new URL(request.url).searchParams.get('sort') ?? 'latest'
    const sorted = mockVideos
      .filter((video) => likedVideoIds.has(video.id))
      .toSorted((first, second) => {
        if (sort === 'popular') return second.viewCount - first.viewCount
        if (sort === 'oldest') return first.publishedAt.localeCompare(second.publishedAt)

        return second.publishedAt.localeCompare(first.publishedAt)
      })

    return HttpResponse.json(
      sorted.map(({ id, videoUrl, caption, viewCount, thumbnailTime, publishedAt }) => ({
        id,
        videoUrl,
        title: caption,
        viewCount,
        thumbnailTime,
        publishedAt,
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
  http.get('*/api/feed/:videoId/comments', async ({ params }) => {
    await delay(250)

    return HttpResponse.json(getComments(String(params.videoId)))
  }),
  http.post('*/api/feed/:videoId/comments', async ({ params, request }) => {
    await delay(350)

    const result = commentRequestSchema.safeParse(await request.json())

    if (!result.success) {
      return HttpResponse.json(
        { message: 'コメントの内容を確認してください。' },
        { status: 400 },
      )
    }

    const videoId = String(params.videoId)
    const video = mockVideos.find((item) => item.id === videoId)
    const comment = {
      id: crypto.randomUUID(),
      author: { name: 'Google User', initials: 'GU' },
      message: result.data.message,
      isSupporter: video ? supportedZooIds.has(video.zoo.id) : false,
      tipAmount: result.data.tipAmount,
      createdAt: new Date().toISOString(),
    }

    if (video && result.data.tipAmount > 0) {
      addSupportGoalAmount(video.zoo.id, result.data.tipAmount)
    }

    getComments(videoId).unshift(comment)

    return HttpResponse.json(comment, { status: 201 })
  }),
]
