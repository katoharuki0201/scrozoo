import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { feedQueryOptions, toggleVideoLike } from '../features/feed/api/feed-api'
import { FeedSheet } from '../features/feed/components/feed-sheet'
import { CommentsSheet } from '../features/feed/components/comments-sheet'
import { VideoFeedCard } from '../features/feed/components/video-feed-card'
import type { FeedVideo } from '../features/feed/model/feed'
import { useAuth } from '../features/auth/hooks/use-auth'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { SearchIcon } from '../shared/ui/icons'
import { createSupportPlan, supportPlansQueryOptions } from '../features/support-plan/api/support-plan-api'
import type { SupportPlan } from '../features/support-plan/model/support-plan'

export function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const feedQuery = useQuery(feedQueryOptions)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [sheet, setSheet] = useState<'comments' | 'support' | null>(null)

  useEffect(() => {
    const videoId = searchParams.get('video')
    const index = feedQuery.data?.findIndex((video) => video.id === videoId) ?? -1
    const root = scrollerRef.current

    if (!root || index < 0) return

    root.scrollTo({ top: root.clientHeight * index })
    setActiveIndex(index)
  }, [feedQuery.data, searchParams])

  useEffect(() => {
    const root = scrollerRef.current

    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        const index = visible?.target.getAttribute('data-index')

        if (index !== null && index !== undefined) {
          setActiveIndex(Number(index))
        }
      },
      { root, threshold: 0.65 },
    )

    root.querySelectorAll('[data-index]').forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [feedQuery.data])

  const likeMutation = useMutation({
    mutationFn: toggleVideoLike,
    onMutate: async (videoId) => {
      await queryClient.cancelQueries({ queryKey: feedQueryOptions.queryKey })
      const previous = queryClient.getQueryData<FeedVideo[]>(feedQueryOptions.queryKey)

      queryClient.setQueryData<FeedVideo[]>(feedQueryOptions.queryKey, (current) =>
        current?.map((video) =>
          video.id === videoId
            ? {
                ...video,
                isLiked: !video.isLiked,
                likeCount: video.likeCount + (video.isLiked ? -1 : 1),
              }
            : video,
        ),
      )

      return { previous }
    },
    onError: (_error, _videoId, context) => {
      queryClient.setQueryData(feedQueryOptions.queryKey, context?.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
  const joinMutation = useMutation({
    mutationFn: createSupportPlan,
    onSuccess: (plan) => {
      queryClient.setQueryData<SupportPlan[]>(
        supportPlansQueryOptions.queryKey,
        (plans) => plans?.some((item) => item.id === plan.id)
          ? plans
          : [...(plans ?? []), plan],
      )
      queryClient.setQueryData<FeedVideo[]>(feedQueryOptions.queryKey, (videos) =>
        videos?.map((video) => {
          if (video.zoo.id !== plan.zoo.id) return video

          const supportGoal = video.supportGoal && video.supportGoal.status !== 'expired'
            ? {
                ...video.supportGoal,
                currentAmount: video.supportGoal.currentAmount + 500,
                status: video.supportGoal.currentAmount + 500 >= video.supportGoal.targetAmount
                  ? 'achieved' as const
                  : video.supportGoal.status,
              }
            : video.supportGoal

          return { ...video, hasActiveSupportPlan: true, supportGoal }
        }),
      )
      queryClient.removeQueries({ queryKey: ['profile', 'zoo', plan.zoo.id] })
    },
  })

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()

    if (query) void navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  function openSupport() {
    joinMutation.reset()
    setSheet('support')
  }

  const activeVideo = feedQuery.data?.[activeIndex]

  return (
    <main className="mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-950 shadow-2xl">
      <div className="relative h-full">
        <form className="absolute inset-x-4 top-4 z-30" onSubmit={submitSearch} role="search">
          <label className="sr-only" htmlFor="feed-search">動物や動物園を検索</label>
          <div className="flex h-12 items-center rounded-2xl border border-white/70 bg-black/20 px-4 text-white shadow-lg backdrop-blur-md focus-within:border-white focus-within:bg-black/35">
            <input
              className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-white/80"
              id="feed-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="動物や動物園を検索..."
              type="search"
              value={search}
            />
            <button aria-label="検索" className="grid size-9 place-items-center" type="submit">
              <SearchIcon className="size-6" />
            </button>
          </div>
        </form>

        {feedQuery.isPending && (
          <div className="grid h-full place-items-center text-white">
            <div aria-label="読み込み中" className="size-8 animate-spin rounded-full border-3 border-white/25 border-t-white" role="status" />
          </div>
        )}

        {feedQuery.isError && (
          <div className="grid h-full place-items-center px-8 text-center text-white">
            <div>
              <p className="font-bold">動画を読み込めませんでした</p>
              <button className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950" onClick={() => void feedQuery.refetch()} type="button">
                もう一度試す
              </button>
            </div>
          </div>
        )}

        {feedQuery.data && (
          <div className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain" ref={scrollerRef}>
            {feedQuery.data.map((item, index) => (
              <div className="h-full snap-start" data-index={index} key={item.id}>
                <VideoFeedCard
                  active={index === activeIndex}
                  isFreeUser={user?.plan === 'free'}
                  item={item}
                  onLike={() => likeMutation.mutate(item.id)}
                  onOpenComments={() => setSheet('comments')}
                  onSupport={openSupport}
                />
              </div>
            ))}
          </div>
        )}

        <BottomNavigation />

        {sheet === 'comments' && activeVideo && (
          <CommentsSheet
            commentCount={activeVideo.commentCount}
            onClose={() => setSheet(null)}
            videoId={activeVideo.id}
          />
        )}

        {sheet === 'support' && (
          <FeedSheet onClose={() => setSheet(null)} title="応援プラン">
            <div className={`mt-5 rounded-2xl p-5 ${activeVideo?.hasActiveSupportPlan ? 'border border-amber-200 bg-amber-50' : 'bg-orange-50'}`}>
              <p className="text-sm font-bold text-orange-700">{activeVideo?.zoo.name}を応援</p>
              <p className="mt-2 text-3xl font-black">
                {activeVideo?.hasActiveSupportPlan ? '応援プラン加入中' : `${activeVideo?.supportPrice}円`}
                {!activeVideo?.hasActiveSupportPlan && <span className="text-sm font-medium text-slate-500"> / 月</span>}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">動画を最後まで視聴しながら、動物たちの暮らしを応援できます。</p>
            </div>
            {!activeVideo?.hasActiveSupportPlan && (
              <button
                className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400 text-sm font-bold text-white disabled:opacity-50"
                disabled={joinMutation.isPending}
                onClick={() => activeVideo && joinMutation.mutate(activeVideo.zoo.id)}
                type="button"
              >
                {joinMutation.isPending ? '加入手続き中...' : '応援プランに参加する'}
              </button>
            )}
            {joinMutation.isSuccess && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700" role="status">
                {activeVideo?.supportGoal && activeVideo.supportGoal.status !== 'expired'
                  ? 'プランに加入し、応援目標に500円追加されました。'
                  : '応援プランに加入しました。'}
              </p>
            )}
            {joinMutation.isError && <p className="mt-3 text-center text-sm font-bold text-red-600" role="alert">加入手続きを完了できませんでした。</p>}
          </FeedSheet>
        )}
      </div>
    </main>
  )
}
