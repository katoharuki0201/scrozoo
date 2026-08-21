import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { zooProfileQueryOptions } from '../features/profile/api/profile-api'
import { ProfileScreen } from '../features/profile/components/profile-screen'
import { FeedSheet } from '../features/feed/components/feed-sheet'
import { createSupportPlan, supportPlansQueryOptions } from '../features/support-plan/api/support-plan-api'

export function ZooProfilePage() {
  const { zooId = '' } = useParams()
  const profileQuery = useQuery(zooProfileQueryOptions(zooId))
  const plansQuery = useQuery(supportPlansQueryOptions)
  const [supportOpen, setSupportOpen] = useState(false)
  const hasActiveSupportPlan = plansQuery.data?.some((plan) => plan.zoo.id === zooId) ?? false
  const joinMutation = useMutation({
    mutationFn: createSupportPlan,
  })

  if (profileQuery.isPending) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 shadow-2xl">
        <div aria-label="プロフィールを読み込み中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
      </main>
    )
  }

  if (profileQuery.isError) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 px-8 text-center shadow-2xl">
        <div>
          <p className="font-bold text-slate-800">プロフィールを読み込めませんでした</p>
          <button className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white" onClick={() => void profileQuery.refetch()} type="button">
            もう一度試す
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <ProfileScreen
        hasActiveSupportPlan={hasActiveSupportPlan}
        onSupport={() => {
          joinMutation.reset()
          setSupportOpen(true)
        }}
        profile={profileQuery.data}
        viewMode="public"
      />
      {supportOpen && (
        <div className="fixed inset-0 z-50 mx-auto max-w-[430px]">
          <FeedSheet onClose={() => setSupportOpen(false)} title="応援プラン">
            <div className={`mt-5 rounded-2xl p-5 ${hasActiveSupportPlan ? 'bg-emerald-50' : 'bg-orange-50'}`}>
              <p className="text-sm font-bold text-orange-700">{profileQuery.data.name}を応援</p>
              <p className="mt-2 text-3xl font-black">
                {hasActiveSupportPlan ? '応援プラン加入中' : <>{profileQuery.data.supportPrice}円<span className="text-sm font-medium text-slate-500"> / 月</span></>}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">動画を最後まで視聴しながら、動物たちの暮らしを応援できます。</p>
              {!hasActiveSupportPlan && <p className="mt-2 text-xs font-bold text-rose-600">Stripeのテストページへ移動します。実際の請求は発生しません。</p>}
            </div>
            {!hasActiveSupportPlan && (
              <button className="mt-4 h-12 w-full rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400 text-sm font-bold text-white disabled:opacity-50" disabled={joinMutation.isPending} onClick={() => joinMutation.mutate(zooId)} type="button">
                {joinMutation.isPending ? '移動中...' : 'テスト決済ページへ進む'}
              </button>
            )}
            {joinMutation.isError && <p className="mt-3 text-center text-sm font-bold text-red-600" role="alert">加入手続きを完了できませんでした。</p>}
          </FeedSheet>
        </div>
      )}
    </>
  )
}
