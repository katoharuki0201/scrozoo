import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'

const MOCK_EMAIL_TOKEN = 'mock-email-session-token'
const MOCK_GOOGLE_TOKEN = 'mock-google-session-token'

let likedVideoIds = new Set<string>()

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
    supportPrice: 300,
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
    supportPrice: 300,
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
    supportPrice: 300,
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

function toProfileMedia(video: (typeof mockVideos)[number], suffix = '') {
  return {
    id: `${video.id}${suffix}`,
    videoId: video.id,
    videoUrl: video.videoUrl,
    title: video.caption,
    viewCount: video.viewCount,
    thumbnailTime: video.thumbnailTime,
  }
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
        role: 'viewer',
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
      return HttpResponse.json({
        id: 'mock-email-user',
        name: 'Mock User',
        email: 'mock.user@example.com',
        avatarUrl: null,
        plan: 'free',
        role: 'viewer',
      })
    }

    if (token === MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({
        id: 'mock-google-user',
        name: 'Google User',
        email: 'google.user@example.com',
        avatarUrl: null,
        plan: 'free',
        role: 'viewer',
      })
    }

    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }),
  http.post('*/api/auth/logout', async () => {
    await delay(200)

    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/api/profiles/me', async ({ request }) => {
    await delay(280)

    const token = getToken(request)

    if (token !== MOCK_EMAIL_TOKEN && token !== MOCK_GOOGLE_TOKEN) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({
      id: token === MOCK_GOOGLE_TOKEN ? 'mock-google-user' : 'mock-email-user',
      accountRole: 'viewer',
      name: token === MOCK_GOOGLE_TOKEN ? 'Google User' : 'Mock User',
      avatarUrl: null,
      bio: '【動物動画の鑑賞垢】動物たちの可愛い姿や面白いハプニング動画を見て日々癒やされています。もふもふ系の動画に無言いいね多めです。素敵な投稿いつもありがとうございます！',
      videoCount: null,
      supporterCount: null,
      supportPrice: null,
      media: mockVideos.slice(0, 6).map((video) => toProfileMedia(video, '-gallery')),
      supporterMedia: [],
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
      media: videos.map((video) => toProfileMedia(video)),
      supporterMedia: videos
        .toReversed()
        .map((video) => toProfileMedia(video, '-supporter')),
    })
  }),
  http.get('*/api/feed', async () => {
    await delay(350)

    return HttpResponse.json(
      mockVideos.map((video) => ({
        ...video,
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
    const comment = {
      id: crypto.randomUUID(),
      author: { name: 'Google User', initials: 'GU' },
      message: result.data.message,
      isSupporter: false,
      tipAmount: result.data.tipAmount,
      createdAt: new Date().toISOString(),
    }

    getComments(videoId).unshift(comment)

    return HttpResponse.json(comment, { status: 201 })
  }),
]
