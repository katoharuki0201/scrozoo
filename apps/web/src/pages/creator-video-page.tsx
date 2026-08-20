import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { myProfileQueryOptions } from '../features/profile/api/profile-api'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { ChevronLeftIcon } from '../shared/ui/icons'

export function CreatorVideoPage() {
  const { videoId = '' } = useParams()
  const profileQuery = useQuery(myProfileQueryOptions)
  const video = profileQuery.data?.videos.find((item) => item.videoId === videoId)

  if (profileQuery.isPending) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-950 shadow-2xl">
        <div aria-label="動画を読み込み中" className="size-8 animate-spin rounded-full border-3 border-white/25 border-t-white" role="status" />
      </main>
    )
  }

  if (profileQuery.isError || !video) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-950 px-8 text-center text-white shadow-2xl">
        <div>
          <h1 className="text-lg font-black">動画を表示できませんでした</h1>
          <Link className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900" to="/mypage">マイページに戻る</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-950 text-white shadow-2xl">
      <video autoPlay className="absolute inset-0 size-full object-cover" controls loop playsInline src={video.videoUrl} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent via-55% to-black/80" />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link aria-label="マイページに戻る" className="grid size-12 place-items-center rounded-full bg-black/35 backdrop-blur-sm" to="/mypage">
          <ChevronLeftIcon className="size-8" />
        </Link>
        <p className="ml-3 text-sm font-black drop-shadow-md">投稿した動画</p>
      </header>

      <section className="pointer-events-none absolute inset-x-0 bottom-22 z-10 px-5 pb-5">
        <h1 className="text-base leading-7 font-black drop-shadow-md">{video.title}</h1>
        <p className="mt-2 text-xs font-bold text-white/70">{video.viewCount.toLocaleString('ja-JP')}回再生</p>
      </section>

      <BottomNavigation activePath="/mypage" />
    </main>
  )
}
