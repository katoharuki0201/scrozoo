import { useQuery } from '@tanstack/react-query'
import { creatorSupportersQueryOptions } from '../features/creator-supporter/api/creator-supporter-api'
import type { CreatorSupporter } from '../features/creator-supporter/model/creator-supporter'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { CalendarIcon, UsersIcon } from '../shared/ui/icons'

const currencyFormatter = new Intl.NumberFormat('ja-JP')
const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00`))
}

function SupporterRow({ supporter }: { supporter: CreatorSupporter }) {
  const cancelScheduled = supporter.status === 'cancel_scheduled'

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-100 to-sky-100 text-sm font-black text-slate-700">
          {supporter.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate pt-0.5 font-black text-slate-800">{supporter.name}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${cancelScheduled ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {cancelScheduled ? '解約予定' : '加入中'}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs text-slate-500">
            <div className="flex items-center justify-between gap-3">
              <dt>プラン加入日</dt>
              <dd className="font-bold text-slate-700">{formatDate(supporter.joinedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>{cancelScheduled ? '利用終了日' : '次回更新日'}</dt>
              <dd className="font-bold text-slate-700">{formatDate(supporter.nextRenewalDate)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  )
}

export function CreatorSupportersPage() {
  const supportersQuery = useQuery(creatorSupportersQueryOptions)

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header>
          <p className="text-xs font-black tracking-[0.16em] text-orange-500 uppercase">Supporters</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">サポーター</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">応援プランに加入中のユーザーを確認できます。</p>
        </header>

        {supportersQuery.isPending && (
          <div className="grid min-h-96 place-items-center">
            <div aria-label="サポーターを読み込み中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
          </div>
        )}

        {supportersQuery.isError && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-center">
            <p className="text-sm font-bold text-red-700">サポーター情報を読み込めませんでした。</p>
            <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => void supportersQuery.refetch()} type="button">もう一度試す</button>
          </div>
        )}

        {supportersQuery.data && (
          <>
            <section className="mt-7 grid grid-cols-2 gap-3" aria-label="サポーター集計">
              <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-lg">
                <UsersIcon className="size-6 text-orange-300" />
                <p className="mt-5 text-3xl font-black">{supportersQuery.data.totalCount}<span className="ml-1 text-sm">人</span></p>
                <p className="mt-1 text-xs font-bold text-slate-300">加入中のサポーター</p>
              </div>
              <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-lg">
                <CalendarIcon className="size-6 text-emerald-100" />
                <p className="mt-5 text-2xl font-black">{currencyFormatter.format(supportersQuery.data.monthlySupportAmount)}<span className="ml-1 text-sm">円</span></p>
                <p className="mt-1 text-xs font-bold text-emerald-100">月間プラン支援額</p>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-black text-slate-900">加入者一覧</h2>
                <p className="text-xs font-bold text-slate-400">加入日の新しい順</p>
              </div>
              <ul className="mt-4 space-y-3">
                {supportersQuery.data.supporters.map((supporter) => (
                  <SupporterRow key={supporter.id} supporter={supporter} />
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
      <BottomNavigation activePath="/mypage/supporters" />
    </main>
  )
}
