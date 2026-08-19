import { useQuery } from '@tanstack/react-query'
import { healthQueryOptions } from '../features/system/api/get-health'

export function HomePage() {
  const healthQuery = useQuery(healthQueryOptions)

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold tracking-widest text-sky-700 uppercase">
          Scrozoo
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Frontend ready
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          ページ実装を始めるための共通基盤を用意しました。
        </p>

        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span
            className={`size-2.5 rounded-full ${
              healthQuery.isSuccess
                ? 'bg-emerald-500'
                : healthQuery.isError
                  ? 'bg-red-500'
                  : 'animate-pulse bg-amber-400'
            }`}
          />
          <span className="font-medium text-slate-700">
            {healthQuery.isSuccess
              ? `MSW connected (${healthQuery.data.mode})`
              : healthQuery.isError
                ? 'MSW connection failed'
                : 'Connecting to MSW...'}
          </span>
        </div>
      </section>
    </main>
  )
}
