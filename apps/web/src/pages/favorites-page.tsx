import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../features/auth/hooks/use-auth'
import { favoriteVideosQueryOptions } from '../features/favorites/api/favorites-api'
import type { FavoriteSort } from '../features/favorites/model/favorite'
import { ProfileAvatar } from '../features/profile/components/profile-avatar'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { VideoGridTile } from '../shared/ui/video-grid-tile'

const sortOptions: Array<{ label: string; value: FavoriteSort }> = [
  { label: '新しい順', value: 'latest' },
  { label: '人気の動画', value: 'popular' },
  { label: '古い順', value: 'oldest' },
]

export function FavoritesPage() {
  const { user } = useAuth()
  const [sort, setSort] = useState<FavoriteSort>('latest')
  const favoritesQuery = useQuery(favoriteVideosQueryOptions(sort))

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto pb-24">
        <header className="px-4 pb-7 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="flex h-16 items-center justify-between px-2">
            <div>
              <p className="-rotate-2 text-3xl font-black tracking-[-0.08em] text-slate-800 italic">Scrozoo</p>
              <h1 className="sr-only">お気に入り</h1>
            </div>
            <ProfileAvatar avatarUrl={user?.avatarUrl ?? null} name={user?.name ?? 'ユーザー'} size="small" />
          </div>

          <div aria-label="並び順" className="mt-6 grid grid-cols-3 gap-3" role="group">
            {sortOptions.map((option) => {
              const selected = sort === option.value

              return (
                <button
                  aria-pressed={selected}
                  className={`h-11 rounded-lg px-2 text-sm font-bold transition ${selected ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-200 text-slate-700 active:bg-slate-300'}`}
                  key={option.value}
                  onClick={() => setSort(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </header>

        {favoritesQuery.isPending && (
          <div className="grid min-h-72 place-items-center">
            <div aria-label="お気に入りを読み込み中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
          </div>
        )}

        {favoritesQuery.isError && (
          <div className="grid min-h-72 place-items-center px-8 text-center">
            <div>
              <p className="font-bold text-slate-800">お気に入りを読み込めませんでした</p>
              <button className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white" onClick={() => void favoritesQuery.refetch()} type="button">
                もう一度試す
              </button>
            </div>
          </div>
        )}

        {favoritesQuery.data?.length === 0 && (
          <div className="grid min-h-80 place-items-center px-8 text-center">
            <div>
              <p className="text-lg font-black text-slate-800">お気に入りはまだありません</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">気に入った動画にいいねして、いつでも見返しましょう。</p>
              <Link className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" to="/">動画を探す</Link>
            </div>
          </div>
        )}

        {favoritesQuery.data && favoritesQuery.data.length > 0 && (
          <section aria-label="お気に入り動画" className="grid grid-cols-3 gap-1">
            {favoritesQuery.data.map((video) => <VideoGridTile item={video} key={video.id} />)}
          </section>
        )}
      </div>

      <BottomNavigation />
    </main>
  )
}
