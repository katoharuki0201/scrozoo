import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-sky-700">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          ページが見つかりません
        </h1>
        <Link
          className="mt-6 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          to="/"
        >
          トップへ戻る
        </Link>
      </div>
    </main>
  )
}
