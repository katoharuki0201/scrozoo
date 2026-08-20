import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { getAdminSubscribers } from '../features/admin/api/admin-api'
import { AdminCard, AdminPageHeader, EmptyState, QueryState, StatusBadge } from '../features/admin/components/admin-ui'
import { formatDate } from '../features/admin/lib/format'

export function AdminSubscribersPage() {
  const query = useQuery({ queryKey: ['admin', 'subscribers'], queryFn: getAdminSubscribers })
  const [searchParams, setSearchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const userId = searchParams.get('userId')
  const creatorId = searchParams.get('creatorId')
  const allSubscribers = useMemo(() => query.data?.subscribers ?? [], [query.data?.subscribers])

  const creatorSummaries = useMemo(() => {
    const summaries = new Map<string, { id: string; name: string; total: number; cancelScheduled: number }>()
    for (const item of allSubscribers) {
      const summary = summaries.get(item.creatorId) ?? { id: item.creatorId, name: item.creatorName, total: 0, cancelScheduled: 0 }
      summary.total += 1
      if (item.status === 'cancel_scheduled') summary.cancelScheduled += 1
      summaries.set(item.creatorId, summary)
    }
    return [...summaries.values()].sort((a, b) => b.total - a.total)
  }, [allSubscribers])

  const subscribers = useMemo(() => allSubscribers.filter((item) => {
    const matchesKeyword = `${item.userName} ${item.email} ${item.creatorName}`.toLowerCase().includes(keyword.toLowerCase())
    const matchesStatus = status === 'all' || item.status === status
    const matchesUser = !userId || item.userId === userId
    const matchesCreator = !creatorId || item.creatorId === creatorId
    return matchesKeyword && matchesStatus && matchesUser && matchesCreator
  }), [allSubscribers, creatorId, keyword, status, userId])

  if (!query.data) return <QueryState error={query.isError} loading={query.isPending} />

  const selectedUser = userId ? allSubscribers.find((item) => item.userId === userId) : null
  const selectedCreator = creatorId ? allSubscribers.find((item) => item.creatorId === creatorId) : null
  const filterLabel = selectedUser
    ? `${selectedUser.userName}さんの加入先`
    : selectedCreator
      ? `${selectedCreator.creatorName}の加入者`
      : null

  function clearRelationFilter() {
    setSearchParams({})
    setKeyword('')
    setStatus('all')
  }

  function selectCreator(value: string) {
    if (value === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ creatorId: value })
    }
  }

  return (
    <div className="space-y-7">
      <AdminPageHeader description="ユーザー別・動物園別に月額500円の応援プラン加入状況を確認できます。" title="プラン加入者" />

      <div className="grid grid-cols-4 gap-4">
        <AdminCard className="p-5"><p className="text-sm text-slate-500">支援ユーザー</p><p className="mt-2 text-3xl font-bold">{new Set(allSubscribers.map((item) => item.userId)).size}<span className="ml-1 text-sm font-medium text-slate-500">人</span></p></AdminCard>
        <AdminCard className="p-5"><p className="text-sm text-slate-500">加入中の契約</p><p className="mt-2 text-3xl font-bold">{allSubscribers.filter((item) => item.status === 'active').length}<span className="ml-1 text-sm font-medium text-slate-500">件</span></p></AdminCard>
        <AdminCard className="p-5"><p className="text-sm text-slate-500">解約予定の契約</p><p className="mt-2 text-3xl font-bold">{allSubscribers.filter((item) => item.status === 'cancel_scheduled').length}<span className="ml-1 text-sm font-medium text-slate-500">件</span></p></AdminCard>
        <AdminCard className="p-5"><p className="text-sm text-slate-500">月間サブスク支援額</p><p className="mt-2 text-3xl font-bold">¥{(allSubscribers.length * 500).toLocaleString()}</p></AdminCard>
      </div>

      <AdminCard>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="text-sm font-bold text-slate-800">動物園別の加入状況</h2><p className="mt-1 text-xs text-slate-500">動物園を選択すると加入者を絞り込めます。</p></div>
          <span className="text-xs font-medium text-slate-500">{creatorSummaries.length}動物園</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-5 py-3">動物園</th><th className="w-28 px-4 py-3 text-right">加入中</th><th className="w-28 px-4 py-3 text-right">解約予定</th><th className="w-24 px-4 py-3 text-right">合計</th><th className="w-28 px-5 py-3 text-right">詳細</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {creatorSummaries.map((creator) => (
                <tr className={creatorId === creator.id ? 'bg-sky-50' : 'hover:bg-slate-50/70'} key={creator.id}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{creator.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{creator.total - creator.cancelScheduled}人</td>
                  <td className="px-4 py-3 text-right text-slate-600">{creator.cancelScheduled}人</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{creator.total}人</td>
                  <td className="px-5 py-3 text-right"><button className="text-xs font-bold text-sky-700 hover:text-sky-900" onClick={() => selectCreator(creator.id)} type="button">加入者を見る</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard>
        {filterLabel && <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50 px-5 py-3"><p className="text-sm font-semibold text-sky-900">{filterLabel}を表示しています</p><button className="text-xs font-bold text-sky-700 hover:text-sky-900" onClick={clearRelationFilter} type="button">すべての加入者を表示</button></div>}
        <div className="flex gap-3 border-b border-slate-200 p-5">
          <input aria-label="加入者を検索" className="h-10 w-80 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100" onChange={(event) => setKeyword(event.target.value)} placeholder="ユーザー・支援先で検索" value={keyword} />
          <select aria-label="動物園" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => selectCreator(event.target.value)} value={creatorId ?? 'all'}><option value="all">すべての動物園</option>{creatorSummaries.map((creator) => <option key={creator.id} value={creator.id}>{creator.name}</option>)}</select>
          <select aria-label="契約状態" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">すべての状態</option><option value="active">加入中</option><option value="cancel_scheduled">解約予定</option></select>
          <span className="ml-auto self-center text-sm text-slate-500">{subscribers.length}件</span>
        </div>
        {subscribers.length === 0 ? <EmptyState>条件に一致する加入者はいません。</EmptyState> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-6 py-3.5">加入者</th><th className="px-5 py-3.5">支援先</th><th className="px-5 py-3.5">加入日</th><th className="px-5 py-3.5">次回更新日</th><th className="px-5 py-3.5">継続期間</th><th className="px-6 py-3.5">状態</th></tr></thead><tbody className="divide-y divide-slate-100">{subscribers.map((item) => <tr className="hover:bg-slate-50/70" key={item.id}><td className="px-6 py-4"><p className="font-semibold text-slate-800">{item.userName}</p><p className="mt-0.5 text-xs text-slate-500">{item.email}</p></td><td className="px-5 py-4 font-medium">{item.creatorName}</td><td className="px-5 py-4 text-slate-500">{formatDate(item.joinedAt)}</td><td className="px-5 py-4 text-slate-500">{formatDate(item.nextRenewalDate)}</td><td className="px-5 py-4">{item.supportedMonths}か月</td><td className="px-6 py-4"><StatusBadge tone={item.status === 'active' ? 'green' : 'amber'}>{item.status === 'active' ? '加入中' : '解約予定'}</StatusBadge></td></tr>)}</tbody></table></div>}
      </AdminCard>
    </div>
  )
}
