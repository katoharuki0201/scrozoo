import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getAdminUsers } from '../features/admin/api/admin-api'
import { AdminCard, AdminPageHeader, EmptyState, QueryState, StatusBadge } from '../features/admin/components/admin-ui'
import { formatDate } from '../features/admin/lib/format'

export function AdminUsersPage() {
  const query = useQuery({ queryKey: ['admin', 'users'], queryFn: getAdminUsers })
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState('all')
  const [plan, setPlan] = useState('all')
  const users = useMemo(() => (query.data?.users ?? []).filter((user) => {
    const matchesKeyword = `${user.name} ${user.email}`.toLowerCase().includes(keyword.toLowerCase())
    return matchesKeyword && (role === 'all' || user.role === role) && (plan === 'all' || user.planStatus === plan)
  }), [keyword, plan, query.data, role])
  if (!query.data) return <QueryState error={query.isError} loading={query.isPending} />

  return (
    <div className="space-y-7">
      <AdminPageHeader description="登録ユーザーとCreatorアカウントを検索・確認できます。" title="ユーザー管理" />
      <AdminCard>
        <div className="flex items-center gap-3 border-b border-slate-200 p-5">
          <input aria-label="ユーザーを検索" className="h-10 w-80 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100" onChange={(event) => setKeyword(event.target.value)} placeholder="名前・メールアドレスで検索" value={keyword} />
          <select aria-label="アカウント種別" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setRole(event.target.value)} value={role}><option value="all">すべての種別</option><option value="viewer">一般ユーザー</option><option value="creator">Creator</option></select>
          <select aria-label="加入状況" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setPlan(event.target.value)} value={plan}><option value="all">すべての加入状況</option><option value="active">加入中</option><option value="cancel_scheduled">解約予定</option><option value="free">未加入</option></select>
          <span className="ml-auto text-sm text-slate-500">{users.length}件</span>
        </div>
        {users.length === 0 ? <EmptyState>条件に一致するユーザーはいません。</EmptyState> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-6 py-3.5">ユーザー</th><th className="px-5 py-3.5">種別</th><th className="px-5 py-3.5">プラン</th><th className="px-5 py-3.5">アカウント状態</th><th className="px-6 py-3.5">登録日</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr className="hover:bg-slate-50/70" key={user.id}><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{user.name.slice(0, 2)}</div><div><p className="font-semibold text-slate-800">{user.name}</p><p className="mt-0.5 text-xs text-slate-500">{user.email}</p></div></div></td><td className="px-5 py-4"><StatusBadge tone={user.role === 'creator' ? 'blue' : 'slate'}>{user.role === 'creator' ? 'Creator' : '一般ユーザー'}</StatusBadge></td><td className="px-5 py-4">{user.planStatus === 'active' ? <StatusBadge tone="green">加入中</StatusBadge> : user.planStatus === 'cancel_scheduled' ? <StatusBadge tone="amber">解約予定</StatusBadge> : user.planStatus === 'free' ? <span className="text-slate-500">未加入</span> : <span className="text-slate-400">—</span>}</td><td className="px-5 py-4"><StatusBadge tone={user.status === 'active' ? 'green' : 'red'}>{user.status === 'active' ? '有効' : '停止中'}</StatusBadge></td><td className="px-6 py-4 text-slate-500">{formatDate(user.registeredAt)}</td></tr>)}</tbody></table></div>}
      </AdminCard>
    </div>
  )
}
