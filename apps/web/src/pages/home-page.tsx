import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../features/auth/hooks/use-auth'
import { healthQueryOptions } from '../features/system/api/get-health'

export function HomePage() {
  const healthQuery = useQuery(healthQueryOptions)
  const { logout, user } = useAuth()

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-widest text-sky-700 uppercase">
            Scrozoo
          </p>
          <button
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={() => void logout()}
            type="button"
          >
            ログアウト
          </button>
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          こんにちは、{user?.name}さん
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          ログインが必要なページです。ここから各機能を追加していけます。
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
