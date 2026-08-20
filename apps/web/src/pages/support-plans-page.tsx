import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  cancelSupportPlan,
  supportPlansQueryOptions,
} from '../features/support-plan/api/support-plan-api'
import type { SupportPlan } from '../features/support-plan/model/support-plan'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  XIcon,
} from '../shared/ui/icons'

function formatDate(date: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T00:00:00`))
}

export function SupportPlansPage() {
  const queryClient = useQueryClient()
  const plansQuery = useQuery(supportPlansQueryOptions)
  const [selectedPlan, setSelectedPlan] = useState<SupportPlan | null>(null)
  const [cancelledZooName, setCancelledZooName] = useState<string | null>(null)
  const cancelMutation = useMutation({
    mutationFn: cancelSupportPlan,
    onSuccess: (cancelledPlan) => {
      queryClient.setQueryData<SupportPlan[]>(
        supportPlansQueryOptions.queryKey,
        (plans) => plans?.map((plan) =>
          plan.id === cancelledPlan.id ? cancelledPlan : plan,
        ),
      )
      setCancelledZooName(cancelledPlan.zoo.name)
      setSelectedPlan(null)
    },
  })

  function openCancellation(plan: SupportPlan) {
    cancelMutation.reset()
    setCancelledZooName(null)
    setSelectedPlan(plan)
  }

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex min-h-14 items-center">
          <Link
            aria-label="マイページに戻る"
            className="grid size-12 shrink-0 place-items-center rounded-full text-slate-800 active:bg-slate-200"
            to="/mypage"
          >
            <ChevronLeftIcon className="size-9" />
          </Link>
          <h1 className="ml-2 text-xl font-black text-slate-800">加入中のプラン</h1>
        </header>

        <p className="mt-6 text-sm leading-6 text-slate-500">
          応援している動物園と、次回の更新日を確認できます。
        </p>

        {cancelledZooName && (
          <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-700" role="status">
            {cancelledZooName}の解約手続きが完了しました。
          </p>
        )}

        {plansQuery.isPending && (
          <div className="grid min-h-72 place-items-center">
            <div
              aria-label="加入中のプランを読み込み中"
              className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700"
              role="status"
            />
          </div>
        )}

        {plansQuery.isError && (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <p className="font-bold text-slate-800">加入中のプランを読み込めませんでした</p>
              <button
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                onClick={() => void plansQuery.refetch()}
                type="button"
              >
                もう一度試す
              </button>
            </div>
          </div>
        )}

        {plansQuery.data?.length === 0 && (
          <div className="mt-12 rounded-3xl bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-slate-100 text-slate-400">
              <HeartIcon className="size-8" />
            </div>
            <h2 className="mt-5 text-lg font-black text-slate-800">加入中のプランはありません</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              動画から応援プランに加入すると、ここに表示されます。
            </p>
            <Link className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" to="/">
              動画を見る
            </Link>
          </div>
        )}

        {plansQuery.data && plansQuery.data.length > 0 && (
          <section aria-label="加入中の応援プラン" className="mt-6 space-y-4">
            {plansQuery.data.map((plan) => {
              const cancellationScheduled = plan.status === 'cancel_scheduled'

              return (
                <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm" key={plan.id}>
                  <Link className="flex items-center gap-3 p-5 pb-4" to={`/zoos/${plan.zoo.id}`}>
                    <img
                      alt=""
                      className="size-14 rounded-full border-2 border-amber-300 object-cover"
                      src={plan.zoo.avatarUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-black text-slate-800">{plan.zoo.name}</h2>
                      <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${cancellationScheduled ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                        {cancellationScheduled ? '解約手続き済み' : '加入中'}
                      </span>
                    </div>
                    <ChevronRightIcon className="size-6 text-slate-300" />
                  </Link>

                  <div className="mx-5 border-t border-slate-100 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                        <CalendarIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">
                          {cancellationScheduled ? '利用終了日' : '次回更新日'}
                        </p>
                        <p className="mt-1 text-base font-black text-slate-800">{formatDate(plan.nextRenewalDate)}</p>
                      </div>
                    </div>

                    {cancellationScheduled ? (
                      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
                        この日までプランの特典をご利用いただけます。
                      </p>
                    ) : (
                      <button
                        className="mt-4 h-11 w-full rounded-xl border border-red-200 text-sm font-bold text-red-600 active:bg-red-50"
                        onClick={() => openCancellation(plan)}
                        type="button"
                      >
                        プランを解約する
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      <BottomNavigation activePath="/mypage" />

      {selectedPlan && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/45" role="presentation" onClick={() => setSelectedPlan(null)}>
          <section
            aria-label="プランの解約確認"
            aria-modal="true"
            className="w-full rounded-t-3xl bg-white px-5 pt-3 text-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-lg font-black">プランを解約しますか？</h2>
              <button
                aria-label="閉じる"
                className="grid size-9 place-items-center rounded-full bg-slate-100"
                onClick={() => setSelectedPlan(null)}
                type="button"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">{selectedPlan.zoo.name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {formatDate(selectedPlan.nextRenewalDate)}までは現在のプラン特典をご利用いただけます。次回の請求は発生しません。
            </p>
            {cancelMutation.isError && (
              <p className="mt-3 text-sm font-bold text-red-600" role="alert">解約手続きを完了できませんでした。</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-700"
                onClick={() => setSelectedPlan(null)}
                type="button"
              >
                キャンセル
              </button>
              <button
                className="h-12 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-50"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(selectedPlan.id)}
                type="button"
              >
                {cancelMutation.isPending ? '手続き中...' : '解約手続きをする'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
