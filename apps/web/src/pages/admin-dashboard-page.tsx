import { useQuery } from '@tanstack/react-query'
import { getAdminDashboard } from '../features/admin/api/admin-api'
import { AdminCard, AdminPageHeader, QueryState } from '../features/admin/components/admin-ui'
import { formatCurrency } from '../features/admin/lib/format'
import { RevenueChart } from '../features/admin/components/revenue-chart'

export function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getAdminDashboard })
  if (!query.data) return <QueryState error={query.isError} loading={query.isPending} />
  const { metrics, monthlyRevenue, recentActivities } = query.data
  const cards = [
    { label: '総ユーザー数', value: metrics.totalUsers.toLocaleString(), note: `前月比 +${metrics.userGrowthRate}%`, tone: 'text-sky-700 bg-sky-50', icon: '人' },
    { label: 'Creator数', value: metrics.creators.toLocaleString(), note: '稼働中アカウント', tone: 'text-indigo-700 bg-indigo-50', icon: 'C' },
    { label: 'プラン契約数', value: metrics.activeSubscribers.toLocaleString(), note: '解約予定を含む', tone: 'text-emerald-700 bg-emerald-50', icon: '♡' },
    { label: '今月の総支援額', value: formatCurrency(metrics.monthlyGross), note: `前月比 +${metrics.revenueGrowthRate}%`, tone: 'text-amber-700 bg-amber-50', icon: '¥' },
    { label: '今月の運営手数料', value: formatCurrency(metrics.monthlyFee), note: '手数料率 10%', tone: 'text-violet-700 bg-violet-50', icon: '%' },
  ]

  return (
    <div className="space-y-7">
      <AdminPageHeader description="SCROZOO全体の利用状況と今月の支援状況です。" title="ダッシュボード" />
      <div className="grid grid-cols-5 gap-4">
        {cards.map((card) => <AdminCard className="p-5" key={card.label}><div className={`grid size-9 place-items-center rounded-xl text-sm font-black ${card.tone}`}>{card.icon}</div><p className="mt-5 text-sm font-medium text-slate-500">{card.label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{card.value}</p><p className="mt-2 text-xs font-medium text-emerald-600">{card.note}</p></AdminCard>)}
      </div>
      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(320px,0.7fr)] gap-6">
        <AdminCard className="p-6"><div className="mb-4"><h2 className="font-bold">月別総支援額</h2><p className="mt-1 text-xs text-slate-500">サブスクと投げ銭を合算した推移</p></div><RevenueChart months={monthlyRevenue} /></AdminCard>
        <AdminCard><div className="border-b border-slate-100 px-6 py-5"><h2 className="font-bold">最近の動き</h2><p className="mt-1 text-xs text-slate-500">サービス内の最新アクティビティ</p></div><div className="divide-y divide-slate-100">{recentActivities.map((activity) => <div className="flex gap-3 px-6 py-4" key={activity.id}><div className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${activity.type === 'support' ? 'bg-emerald-50 text-emerald-700' : activity.type === 'creator' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'}`}>{activity.type === 'support' ? '¥' : activity.type === 'creator' ? 'C' : '人'}</div><div><p className="text-sm font-semibold text-slate-800">{activity.title}</p><p className="mt-0.5 text-xs text-slate-500">{activity.detail}</p><p className="mt-1.5 text-[11px] text-slate-400">{activity.occurredAt}</p></div></div>)}</div></AdminCard>
      </div>
    </div>
  )
}
