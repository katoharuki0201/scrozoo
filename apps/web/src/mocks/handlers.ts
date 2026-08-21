import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'

const MOCK_EMAIL_TOKEN = 'mock-email-session-token'
const MOCK_GOOGLE_TOKEN = 'mock-google-session-token'
const MOCK_CREATOR_TOKEN = 'mock-creator-session-token'
let mockCurrentToken: string | null = null
let mockAdminSignedIn = false

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

const supporterNames = [
  'kuma_maru',
  'aozora',
  'animal_fan',
  'mofumofu_days',
  'zoo_life',
  'haru_camera',
  'panda_note',
  'sora_park',
  'yume_animal',
  'natsu_photo',
  'rin_zoo',
  'tomo_walk',
]

const mockCreatorSupporters = Array.from({ length: 38 }, (_, index) => {
  const baseName = supporterNames[index % supporterNames.length]
  const name = index < supporterNames.length
    ? baseName
    : `${baseName}_${Math.floor(index / supporterNames.length) + 1}`
  const joinedAt = new Date(Date.UTC(2026, 7, 20 - index))
  const nextRenewalDate = new Date(Date.UTC(2026, 8, (index % 25) + 1))

  return {
    id: `supporter-${index + 1}`,
    name,
    initials: name
      .split('_')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
    avatarUrl: null,
    joinedAt: joinedAt.toISOString().slice(0, 10),
    nextRenewalDate: nextRenewalDate.toISOString().slice(0, 10),
    status: [5, 17, 29].includes(index) ? 'cancel_scheduled' as const : 'active' as const,
  }
})

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
  tipAmount: z.number().int().refine((amount) => amount === 0 || (amount >= 100 && amount <= 3000)),
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

const adminLoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

const createAdminCreatorRequestSchema = z.object({
  zooName: z.string().trim().min(1).max(50),
  managerName: z.string().trim().min(1).max(30),
  email: z.email(),
  password: z.string().min(8),
})

const updateAdminCreatorStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
})

const registrationRequestSchema = z.object({
  name: z.string().trim().min(1).max(30),
  email: z.email(),
  password: z.string().min(8),
})

const accountInformationRequestSchema = z.object({
  name: z.string().trim().min(1).max(30),
  bio: z.string().trim().max(200),
})

const qrVerificationRequestSchema = z.object({
  payload: z.string(),
})

const galleryPostRequestSchema = z.object({
  sessionId: z.string(),
  imageUploadId: z.string(),
})

const mockUploads = new Map<string, { contentType: string; uploaded: boolean }>()

const supportGoalRequestSchema = z.object({
  title: z.string().trim().min(1).max(50),
  targetAmount: z.number().int().min(500),
  deadline: z.string(),
})

const createSupportPlanRequestSchema = z.object({
  zooId: z.string(),
})

const creatorPostMetadataSchema = z.object({
  videoUploadId: z.string(),
  previewUploadId: z.string(),
  durationMs: z.number().int().positive().max(60_000),
  caption: z.string().trim().min(1).max(120),
  tags: z.array(z.string().trim().min(1).max(20)).max(5),
})

const defaultBio = '【動物動画の鑑賞垢】動物たちの可愛い姿や面白いハプニング動画を見て日々癒やされています。もふもふ系の動画に無言いいね多めです。素敵な投稿いつもありがとうございます！'
const creatorBio = '【多摩動物公園 公式】豊かな自然の中で個性あふれる動物たちと出会える場所。園内の最新情報や動物たちのほっこりする日常動画をお届けします！'

const accountByToken = new Map<string, { name: string; email: string; bio: string; role: 'viewer' | 'creator' }>([
  [MOCK_EMAIL_TOKEN, { name: 'Mock User', email: 'mock.user@example.com', bio: defaultBio, role: 'viewer' }],
  [MOCK_GOOGLE_TOKEN, { name: 'Google User', email: 'google.user@example.com', bio: defaultBio, role: 'viewer' }],
  [MOCK_CREATOR_TOKEN, { name: '多摩動物公園', email: 'creator@scrozoo.jp', bio: creatorBio, role: 'creator' }],
])

const registeredEmails = new Set([
  'mock.user@example.com',
  'google.user@example.com',
  'creator@scrozoo.jp',
])

type MockAdminCreator = {
  id: string
  zooName: string
  managerName: string
  email: string
  password: string
  token: string
  issuedAt: string
  status: 'active' | 'suspended'
  supporterCount: number
}

const mockAdminCreators: MockAdminCreator[] = [
  { id: 'creator-tama', zooName: '多摩動物公園', managerName: '佐藤 美咲', email: 'creator@scrozoo.jp', password: 'password123', token: MOCK_CREATOR_TOKEN, issuedAt: '2026-04-12', status: 'active', supporterCount: 8 },
  { id: 'creator-higashiyama', zooName: '東山動植物園', managerName: '鈴木 拓海', email: 'higashiyama@scrozoo.jp', password: 'password123', token: 'mock-creator-higashiyama-token', issuedAt: '2026-05-21', status: 'active', supporterCount: 4 },
  { id: 'creator-ueno', zooName: '上野動物園', managerName: '高橋 葵', email: 'ueno@scrozoo.jp', password: 'password123', token: 'mock-creator-ueno-token', issuedAt: '2026-06-08', status: 'active', supporterCount: 6 },
]

for (const creator of mockAdminCreators) {
  registeredEmails.add(creator.email)
  if (!accountByToken.has(creator.token)) {
    accountByToken.set(creator.token, { name: creator.zooName, email: creator.email, bio: `${creator.zooName}の公式アカウントです。`, role: 'creator' })
  }
}

const adminRevenueMonths = [
  [2025, 9, 1500, 600], [2025, 10, 2000, 900], [2025, 11, 2500, 1100], [2025, 12, 3000, 1800],
  [2026, 1, 3500, 1400], [2026, 2, 4000, 1700], [2026, 3, 4500, 2100], [2026, 4, 5500, 2400],
  [2026, 5, 6000, 3000], [2026, 6, 7000, 3500], [2026, 7, 8000, 4100], [2026, 8, 9000, 4800],
].map(([year, month, subscription, tips]) => {
  const gross = subscription + tips
  const platformFee = Math.round(gross * 0.1)
  return { month: `${year}-${String(month).padStart(2, '0')}`, subscription, tips, gross, platformFee, creatorPayout: gross - platformFee }
})

const adminFamilyNames = ['田中', '佐々木', '伊藤', '渡辺', '山本', '小林', '加藤', '吉田', '山田', '松本', '井上', '木村', '林', '清水', '斎藤']
const adminGivenNames = ['ひなた', '凛', '颯太', '結衣', '悠真', '美月', '蓮']
const mockAdminViewers = Array.from({ length: 105 }, (_, index) => ({
  id: `admin-viewer-${index + 1}`,
  name: `${adminFamilyNames[index % adminFamilyNames.length]} ${adminGivenNames[Math.floor(index / adminFamilyNames.length)]}`,
  email: `user${String(index + 1).padStart(3, '0')}@example.com`,
  role: 'viewer' as const,
  planStatus: index >= 15 ? 'free' as const : index === 5 ? 'cancel_scheduled' as const : 'active' as const,
  status: index === 93 ? 'suspended' as const : 'active' as const,
  registeredAt: new Date(Date.UTC(2026, 7, 20 - index * 3)).toISOString().slice(0, 10),
}))

const mockAdminSubscribers = Array.from({ length: 18 }, (_, index) => ({
  id: `admin-subscriber-${index + 1}`,
  userId: mockAdminViewers[index < 15 ? index : index - 15].id,
  userName: mockAdminViewers[index < 15 ? index : index - 15].name,
  email: mockAdminViewers[index < 15 ? index : index - 15].email,
  creatorId: index < 8 ? 'creator-tama' : index < 14 ? 'creator-ueno' : 'creator-higashiyama',
  creatorName: index < 8 ? '多摩動物公園' : index < 14 ? '上野動物園' : '東山動植物園',
  joinedAt: `2026-${String(Math.max(1, 8 - (index % 7))).padStart(2, '0')}-${String((index % 20) + 1).padStart(2, '0')}`,
  nextRenewalDate: `2026-09-${String((index % 24) + 1).padStart(2, '0')}`,
  status: [5, 15].includes(index) ? 'cancel_scheduled' as const : 'active' as const,
  supportedMonths: (index % 11) + 1,
}))

function getToken(request: Request) {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? mockCurrentToken
}

function requireAdmin(request: Request) {
  void request
  return mockAdminSignedIn
}

function publicAdminCreator(creator: MockAdminCreator) {
  const { password: _password, token: _token, ...publicCreator } = creator
  return publicCreator
}

function currentTokyoDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
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

const mockCreatorVisitQrToken = 'scrozoo:visit:tama:permanent-demo'

function mockCreatorVisitQrPayload() {
  const url = new URL('/scan', location.origin)
  url.searchParams.set('payload', mockCreatorVisitQrToken)
  return url.toString()
}

export const handlers = [
  http.post('*/api/auth/sign-up/email', async ({ request }) => {
    await delay(500)
    const result = registrationRequestSchema.safeParse(await request.json())
    if (!result.success) return HttpResponse.json({ message: '入力内容を確認してください。' }, { status: 422 })
    const email = result.data.email.toLowerCase()
    if (registeredEmails.has(email)) return HttpResponse.json({ message: 'このメールアドレスはすでに登録されています。' }, { status: 409 })
    registeredEmails.add(email)
    accountByToken.set(MOCK_EMAIL_TOKEN, { name: result.data.name, email, bio: '', role: 'viewer' })
    mockCurrentToken = MOCK_EMAIL_TOKEN
    return HttpResponse.json({ user: { id: 'mock-email-user', name: result.data.name, email, image: null, role: 'viewer' } })
  }),
  http.post('*/api/auth/sign-in/email', async ({ request }) => {
    await delay(450)
    const result = loginRequestSchema.safeParse(await request.json())
    if (!result.success) return HttpResponse.json({ message: 'メールアドレスまたはパスワードが正しくありません。' }, { status: 401 })
    const email = result.data.email.toLowerCase()
    const creator = mockAdminCreators.find((item) => item.email === email)
    if (creator && (creator.password !== result.data.password || creator.status !== 'active')) return HttpResponse.json({ message: 'メールアドレスまたはパスワードが正しくありません。' }, { status: 401 })
    const token = creator?.token ?? MOCK_EMAIL_TOKEN
    const account = creator ? accountByToken.get(token)! : accountByToken.get(MOCK_EMAIL_TOKEN)!
    mockCurrentToken = token
    return HttpResponse.json({ user: { id: creator?.id ?? 'mock-email-user', name: account.name, email: account.email, image: null, role: account.role } })
  }),
  http.post('*/api/auth/sign-in/social', async () => {
    mockCurrentToken = MOCK_GOOGLE_TOKEN
    return HttpResponse.json({ url: location.origin })
  }),
  http.get('*/api/auth/get-session', async () => {
    const account = mockCurrentToken ? accountByToken.get(mockCurrentToken) : null
    if (!account) return HttpResponse.json(null)
    const creator = mockAdminCreators.find((item) => item.token === mockCurrentToken)
    return HttpResponse.json({ user: { id: creator?.id ?? (mockCurrentToken === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user'), name: account.name, email: account.email, image: null, role: account.role } })
  }),
  http.post('*/api/auth/sign-out', async () => {
    mockCurrentToken = null
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/api/uploads', async ({ request }) => {
    const body = z.object({
      purpose: z.string(),
      contentType: z.string(),
      size: z.number().positive(),
      fileName: z.string().min(1),
    }).safeParse(await request.json())
    if (!body.success) return HttpResponse.json({ message: 'Invalid upload' }, { status: 422 })
    const uploadId = crypto.randomUUID()
    mockUploads.set(uploadId, { contentType: body.data.contentType, uploaded: false })
    return HttpResponse.json({
      uploadId,
      uploadUrl: `${location.origin}/mock-uploads/${uploadId}`,
      objectKey: `mock/${uploadId}`,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      headers: { 'Content-Type': body.data.contentType },
    }, { status: 201 })
  }),
  http.put('*/mock-uploads/:uploadId', async ({ params }) => {
    const upload = mockUploads.get(String(params.uploadId))
    if (!upload) return new HttpResponse(null, { status: 404 })
    upload.uploaded = true
    return new HttpResponse(null, { status: 200, headers: { ETag: '"mock-etag"' } })
  }),
  http.post('*/api/uploads/:uploadId/complete', async ({ params, request }) => {
    const uploadId = String(params.uploadId)
    const upload = mockUploads.get(uploadId)
    const body = await request.json() as { etag?: unknown }
    if (!upload?.uploaded || body.etag !== '"mock-etag"') return HttpResponse.json({ message: 'Upload incomplete' }, { status: 409 })
    return HttpResponse.json({ uploadId, objectKey: `mock/${uploadId}`, status: 'ready' })
  }),
  http.get('*/api/health', async () => {
    await delay(300)

    return HttpResponse.json({
      status: 'ok',
      mode: 'mock',
    })
  }),
  http.post('*/api/admin/auth/login', async ({ request }) => {
    await delay(500)
    const result = adminLoginRequestSchema.safeParse(await request.json())
    if (!result.success || result.data.email.toLowerCase() !== 'admin@scrozoo.jp' || result.data.password !== 'admin1234') {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    mockAdminSignedIn = true
    return HttpResponse.json({ admin: { id: 'admin-1', name: 'SCROZOO管理者', email: 'admin@scrozoo.jp' } })
  }),
  http.get('*/api/admin/auth/session', async ({ request }) => {
    await delay(200)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    return HttpResponse.json({ id: 'admin-1', name: 'SCROZOO管理者', email: 'admin@scrozoo.jp' })
  }),
  http.post('*/api/admin/auth/logout', async () => {
    await delay(150)
    mockAdminSignedIn = false
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/api/admin/dashboard', async ({ request }) => {
    await delay(350)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const latest = adminRevenueMonths.at(-1)!
    const previous = adminRevenueMonths.at(-2)!
    return HttpResponse.json({
      metrics: { totalUsers: mockAdminViewers.length + mockAdminCreators.length, creators: mockAdminCreators.filter((creator) => creator.status === 'active').length, activeSubscribers: mockAdminSubscribers.length, monthlyGross: latest.gross, monthlyFee: latest.platformFee, userGrowthRate: 6.9, revenueGrowthRate: Math.round(((latest.gross - previous.gross) / previous.gross) * 1000) / 10 },
      monthlyRevenue: adminRevenueMonths.slice(-8),
      recentActivities: [
        { id: 'activity-1', title: '新しいプラン加入', detail: '田中 ひなたさんが多摩動物公園に加入', occurredAt: '12分前', type: 'support' },
        { id: 'activity-2', title: 'ユーザー登録', detail: '新しい一般ユーザーが登録されました', occurredAt: '28分前', type: 'user' },
        { id: 'activity-3', title: 'Creatorアカウント発行', detail: '上野動物園のアカウントを発行', occurredAt: '2時間前', type: 'creator' },
        { id: 'activity-4', title: '投げ銭', detail: '東山動植物園へ500円の支援', occurredAt: '3時間前', type: 'support' },
      ],
    })
  }),
  http.get('*/api/admin/users', async ({ request }) => {
    await delay(300)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const creators = mockAdminCreators.map((creator) => ({ id: creator.id, name: creator.zooName, email: creator.email, role: 'creator' as const, planStatus: 'not_applicable' as const, status: creator.status, registeredAt: creator.issuedAt }))
    return HttpResponse.json({ users: [...mockAdminViewers, ...creators] })
  }),
  http.get('*/api/admin/subscribers', async ({ request }) => {
    await delay(300)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    return HttpResponse.json({ subscribers: mockAdminSubscribers })
  }),
  http.get('*/api/admin/revenue', async ({ request }) => {
    await delay(350)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    return HttpResponse.json({ feeRate: 10, months: adminRevenueMonths })
  }),
  http.get('*/api/admin/creators', async ({ request }) => {
    await delay(300)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    return HttpResponse.json({ creators: mockAdminCreators.map(publicAdminCreator) })
  }),
  http.post('*/api/admin/creators', async ({ request }) => {
    await delay(500)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const result = createAdminCreatorRequestSchema.safeParse(await request.json())
    if (!result.success || registeredEmails.has(result.data.email.toLowerCase())) return HttpResponse.json({ message: 'Invalid request' }, { status: 409 })
    const email = result.data.email.toLowerCase()
    const creator: MockAdminCreator = { id: `creator-${crypto.randomUUID()}`, zooName: result.data.zooName, managerName: result.data.managerName, email, password: result.data.password, token: `mock-creator-${crypto.randomUUID()}-token`, issuedAt: currentTokyoDate(), status: 'active', supporterCount: 0 }
    mockAdminCreators.unshift(creator)
    registeredEmails.add(email)
    accountByToken.set(creator.token, { name: creator.zooName, email, bio: `${creator.zooName}の公式アカウントです。`, role: 'creator' })
    return HttpResponse.json({ creator: publicAdminCreator(creator), temporaryPassword: result.data.password }, { status: 201 })
  }),
  http.patch('*/api/admin/creators/:creatorId/status', async ({ params, request }) => {
    await delay(350)
    if (!requireAdmin(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const result = updateAdminCreatorStatusSchema.safeParse(await request.json())
    const creator = mockAdminCreators.find((item) => item.id === params.creatorId)
    if (!result.success || !creator) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    creator.status = result.data.status
    if (creator.status === 'suspended') {
      accountByToken.delete(creator.token)
    } else {
      accountByToken.set(creator.token, { name: creator.zooName, email: creator.email, bio: `${creator.zooName}の公式アカウントです。`, role: 'creator' })
    }
    return HttpResponse.json(publicAdminCreator(creator))
  }),
  http.post('*/api/auth/register', async ({ request }) => {
    await delay(700)

    const result = registrationRequestSchema.safeParse(await request.json())

    if (!result.success) {
      return HttpResponse.json(
        { message: '入力内容を確認してください。' },
        { status: 400 },
      )
    }

    const email = result.data.email.toLowerCase()

    if (registeredEmails.has(email)) {
      return HttpResponse.json(
        { message: 'このメールアドレスはすでに登録されています。' },
        { status: 409 },
      )
    }

    registeredEmails.add(email)
    accountByToken.set(MOCK_EMAIL_TOKEN, {
      name: result.data.name,
      email,
      bio: '',
      role: 'viewer',
    })

    return HttpResponse.json(
      {
        token: MOCK_EMAIL_TOKEN,
        user: {
          id: `viewer-${Date.now()}`,
          name: result.data.name,
          email,
          avatarUrl: null,
          plan: 'free',
          role: 'viewer',
        },
      },
      { status: 201 },
    )
  }),
  http.post('*/api/auth/register/google', async () => {
    await delay(600)

    registeredEmails.add('google.user@example.com')

    return HttpResponse.json(
      {
        token: MOCK_GOOGLE_TOKEN,
        user: {
          id: 'mock-google-user',
          name: 'Google User',
          email: 'google.user@example.com',
          avatarUrl: null,
          plan: 'free',
          role: 'viewer',
        },
      },
      { status: 201 },
    )
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

    const email = result.data.email.toLowerCase()
    const creatorAccount = mockAdminCreators.find((creator) => creator.email === email)

    if (creatorAccount && (creatorAccount.password !== result.data.password || creatorAccount.status !== 'active')) {
      return HttpResponse.json(
        { message: 'メールアドレスまたはパスワードが正しくありません。' },
        { status: 401 },
      )
    }

    const creatorLogin = Boolean(creatorAccount)
    const name = creatorAccount?.zooName ?? result.data.email.split('@')[0]
    const role = creatorLogin ? 'creator' as const : 'viewer' as const
    const token = creatorAccount?.token ?? MOCK_EMAIL_TOKEN
    accountByToken.set(token, {
      name,
      email,
      bio: creatorLogin ? accountByToken.get(token)?.bio ?? `${name}の公式アカウントです。` : accountByToken.get(MOCK_EMAIL_TOKEN)?.bio ?? defaultBio,
      role,
    })

    return HttpResponse.json({
      token,
      user: {
        id: creatorAccount?.id ?? 'mock-email-user',
        name,
        email,
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
    const account = accountByToken.get(token ?? '')

    if (account) {
      const creatorAccount = mockAdminCreators.find((creator) => creator.token === token)
      return HttpResponse.json({
        id: creatorAccount?.id ?? (token === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user'),
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

    const isDemoQr = result.success && result.data.payload === 'scrozoo:visit:higashiyama:demo-2026'
    const isCreatorQr = result.success && (
      result.data.payload === mockCreatorVisitQrToken
      || result.data.payload === mockCreatorVisitQrPayload()
    )

    if (!isDemoQr && !isCreatorQr) {
      return HttpResponse.json({ message: 'Invalid QR code' }, { status: 400 })
    }

    const sessionId = crypto.randomUUID()
    const session = {
      sessionId,
      zoo: isCreatorQr
        ? { id: 'tama', name: '多摩動物公園' }
        : { id: 'higashiyama', name: '東山動植物園' },
      expiresAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      used: false,
    }
    qrVisitSessions.set(sessionId, session)

    return HttpResponse.json({
      sessionId: session.sessionId,
      zoo: session.zoo,
      expiresAt: session.expiresAt,
    })
  }),
  http.get('*/api/publisher/visit-qr', async ({ request }) => {
    await delay(350)

    const account = accountByToken.get(getToken(request) ?? '')
    if (account?.role !== 'creator') {
      return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    return HttpResponse.json({
      payload: mockCreatorVisitQrPayload(),
      expiresAt: null,
      zoo: { id: 'tama', name: account.name },
    })
  }),
  http.get('*/api/qr/sessions/:sessionId', async ({ params, request }) => {
    await delay(250)

    const token = getToken(request)
    const session = qrVisitSessions.get(String(params.sessionId))

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
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

    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      return HttpResponse.json({ message: 'Visit session expired' }, { status: 400 })
    }

    const post = {
      id: crypto.randomUUID(),
      imageUrl: '/gallery01.jpg',
      createdAt: new Date().toISOString(),
      author: {
        id: token === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user',
        name: account.name,
      },
      zoo: session.zoo,
    }
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
    const updated = { ...currentAccount, ...result.data }
    accountByToken.set(token, updated)

    return HttpResponse.json(updated)
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

    const zooExists = mockVideos.some((video) => video.zoo.id === result.data.zooId)
    if (!zooExists) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const video = mockVideos.find((item) => item.zoo.id === result.data.zooId)!
    let plan = mockSupportPlans.find((item) => item.zoo.id === result.data.zooId)
    if (!plan) {
      plan = {
        id: `support-plan-${crypto.randomUUID()}`,
        zoo: { id: video.zoo.id, name: video.zoo.name, avatarUrl: video.zoo.avatarUrl },
        nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'active',
      }
      mockSupportPlans = [plan, ...mockSupportPlans]
      supportedZooIds.add(result.data.zooId)
      addSupportGoalAmount(result.data.zooId, 500)
    }
    return HttpResponse.json({ checkoutUrl: 'https://buy.stripe.com/test_7sYcN5b1wgAafpA8JwaMU00', mode: 'mock', plan })
  }),
  http.post('*/api/videos/:videoId/tip-checkout', async ({ params, request }) => {
    const account = accountByToken.get(getToken(request) ?? '')
    if (!account || account.role === 'creator') return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    const result = z.object({ amount: z.number().int().min(100).max(3000), comment: z.string().trim().min(1).max(200) }).safeParse(await request.json())
    const videoId = String(params.videoId)
    const video = mockVideos.find((item) => item.id === videoId)
    if (!result.success || !video) return HttpResponse.json({ message: 'Invalid tip' }, { status: 422 })
    const comment = {
      id: crypto.randomUUID(),
      author: { name: account.name, initials: account.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), avatarUrl: null },
      message: result.data.comment,
      isSupporter: true,
      tipAmount: result.data.amount,
      createdAt: new Date().toISOString(),
    }
    getComments(videoId).unshift(comment)
    addSupportGoalAmount(video.zoo.id, result.data.amount)
    return HttpResponse.json({ checkoutUrl: 'https://buy.stripe.com/test_7sYcN5b1wgAafpA8JwaMU00', mode: 'mock', comment })
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
  http.post('*/api/creator/posts', async ({ request }) => {
    await delay(900)

    const account = accountByToken.get(getToken(request) ?? '')

    if (account?.role !== 'creator') {
      return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const metadata = creatorPostMetadataSchema.safeParse(await request.json())
    if (!metadata.success) {
      return HttpResponse.json({ message: 'Invalid post' }, { status: 400 })
    }

    const id = `creator-video-${Date.now()}`
    const post = {
      ...mockVideos[0],
      id,
      videoUrl: '/videos/14634386_1080_1920_30fps.mp4',
      caption: metadata.data.caption,
      tags: metadata.data.tags,
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      thumbnailTime: 0,
      publishedAt: new Date().toISOString(),
    }
    mockVideos.unshift(post)
    zooProfileDetails.tama.videoCount += 1

    return HttpResponse.json(
      {
        ...post,
        hasActiveSupportPlan: false,
        supportGoal: toSupportGoal(supportGoalsByZoo.get('tama')),
        isLiked: false,
      },
      { status: 201 },
    )
  }),
  http.get('*/api/publisher/animals', async ({ request }) => {
    const account = accountByToken.get(getToken(request) ?? '')
    if (account?.role !== 'creator') return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    return HttpResponse.json([{ id: 'tama-kangaroo', name: 'ルー', species: 'カンガルー' }, { id: 'tama-tiger', name: 'アイ', species: 'トラ' }])
  }),
  http.get('*/api/creator/supporters', async ({ request }) => {
    await delay(420)

    const account = accountByToken.get(getToken(request) ?? '')

    if (account?.role !== 'creator') {
      return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    return HttpResponse.json({
      totalCount: mockCreatorSupporters.length,
      monthlySupportAmount: mockCreatorSupporters.length * 500,
      supporters: mockCreatorSupporters,
    })
  }),
  http.get('*/api/profiles/me', async ({ request }) => {
    await delay(280)

    const token = getToken(request)

    if (!accountByToken.has(token ?? '')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const account = accountByToken.get(token!)!

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
  http.get('*/api/users/:userId/profile', async ({ params }) => {
    const supporter = mockCreatorSupporters.find((item) => item.id === String(params.userId))
    if (!supporter) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({ id: supporter.id, accountRole: 'viewer', name: supporter.name, avatarUrl: supporter.avatarUrl, bio: '動物たちを応援しています。', videoCount: null, supporterCount: null, supportPrice: null, supportGoal: null, videos: [], galleryPosts: [] })
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
      author: { name: 'Google User', initials: 'GU', avatarUrl: null },
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
