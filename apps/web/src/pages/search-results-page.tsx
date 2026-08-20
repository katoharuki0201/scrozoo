import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { searchVideosQueryOptions } from '../features/search/api/search-api'
import { SearchVideoTile } from '../features/search/components/search-video-tile'
import type { SearchSort } from '../features/search/model/search'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { ChevronLeftIcon } from '../shared/ui/icons'

const sortOptions: Array<{ label: string; value: SearchSort }> = [
  { label: '新しい順', value: 'latest' },
  { label: '人気の動画', value: 'popular' },
  { label: '古い順', value: 'oldest' },
]

export function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const [sort, setSort] = useState<SearchSort>('latest')
  const resultsQuery = useQuery(searchVideosQueryOptions(query, sort))

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto pb-24">
        <header className="px-4 pb-7 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <div className="relative flex h-14 items-center justify-center">
            <Link
              aria-label="ホームに戻る"
              className="absolute left-0 grid size-12 place-items-center rounded-full text-slate-800 active:bg-slate-200"
              to="/"
            >
              <ChevronLeftIcon className="size-9" />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">検索結果</h1>
          </div>

          {query && (
            <p className="mt-1 truncate px-14 text-center text-sm text-slate-500">
              「{query}」の検索結果
            </p>
          )}

          <div aria-label="並び順" className="mt-7 grid grid-cols-3 gap-3" role="group">
            {sortOptions.map((option) => {
              const selected = sort === option.value

              return (
                <button
                  aria-pressed={selected}
                  className={`h-11 rounded-lg px-2 text-sm font-bold transition ${
                    selected
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-700 active:bg-slate-300'
                  }`}
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

        {resultsQuery.isPending && (
          <div className="grid min-h-72 place-items-center">
            <div
              aria-label="検索結果を読み込み中"
              className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700"
              role="status"
            />
          </div>
        )}

        {resultsQuery.isError && (
          <div className="grid min-h-72 place-items-center px-8 text-center">
            <div>
              <p className="font-bold text-slate-800">検索結果を読み込めませんでした</p>
              <button
                className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
                onClick={() => void resultsQuery.refetch()}
                type="button"
              >
                もう一度試す
              </button>
            </div>
          </div>
        )}

        {resultsQuery.data?.length === 0 && (
          <div className="grid min-h-72 place-items-center px-8 text-center">
            <div>
              <p className="font-bold text-slate-800">動画が見つかりませんでした</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">別の動物や動物園の名前で検索してみてください。</p>
            </div>
          </div>
        )}

        {resultsQuery.data && resultsQuery.data.length > 0 && (
          <section aria-label="動画の検索結果" className="grid grid-cols-3 gap-1">
            {resultsQuery.data.map((video) => (
              <SearchVideoTile key={video.id} video={video} />
            ))}
          </section>
        )}
      </div>

      <BottomNavigation activePath="/" />
    </main>
  )
}
