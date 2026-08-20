import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createAdminCreator, getAdminCreators, updateAdminCreatorStatus } from '../features/admin/api/admin-api'
import { AdminCard, AdminPageHeader, EmptyState, QueryState, StatusBadge } from '../features/admin/components/admin-ui'
import { formatDate } from '../features/admin/lib/format'
import { createCreatorFormSchema, type CreateCreatorFormValues, type IssuedCreator } from '../features/admin/model/admin'

export function AdminCreatorsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'creators'], queryFn: getAdminCreators })
  const [showForm, setShowForm] = useState(false)
  const [issued, setIssued] = useState<IssuedCreator | null>(null)
  const [copied, setCopied] = useState(false)
  const form = useForm<CreateCreatorFormValues>({ resolver: zodResolver(createCreatorFormSchema), defaultValues: { zooName: '', managerName: '', email: '', password: '' } })
  const createMutation = useMutation({
    mutationFn: createAdminCreator,
    onSuccess: (result) => {
      setIssued(result)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'creators'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) => updateAdminCreatorStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'creators'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  if (!query.data) return <QueryState error={query.isError} loading={query.isPending} />

  function closeDialog() {
    setShowForm(false)
    setIssued(null)
    setCopied(false)
    form.reset()
  }

  async function copyCredentials() {
    if (!issued) return
    await navigator.clipboard.writeText(`SCROZOO Creatorログイン\nメールアドレス: ${issued.creator.email}\n初期パスワード: ${issued.temporaryPassword}`)
    setCopied(true)
  }

  return (
    <div className="space-y-7">
      <AdminPageHeader action={<button className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700" onClick={() => setShowForm(true)} type="button">＋ Creatorを発行</button>} description="動物園のCreatorアカウントを発行・管理できます。" title="Creator管理" />
      <div className="grid grid-cols-3 gap-4"><AdminCard className="p-5"><p className="text-sm text-slate-500">Creator総数</p><p className="mt-2 text-3xl font-bold">{query.data.creators.length}</p></AdminCard><AdminCard className="p-5"><p className="text-sm text-slate-500">有効なアカウント</p><p className="mt-2 text-3xl font-bold text-emerald-700">{query.data.creators.filter((creator) => creator.status === 'active').length}</p></AdminCard><AdminCard className="p-5"><p className="text-sm text-slate-500">総サポーター数</p><p className="mt-2 text-3xl font-bold">{query.data.creators.reduce((sum, creator) => sum + creator.supporterCount, 0)}</p></AdminCard></div>
      <AdminCard>{query.data.creators.length === 0 ? <EmptyState>Creatorアカウントはまだありません。</EmptyState> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-6 py-3.5">動物園</th><th className="px-5 py-3.5">担当者</th><th className="px-5 py-3.5">発行日</th><th className="px-5 py-3.5 text-right">サポーター</th><th className="px-5 py-3.5">状態</th><th className="px-6 py-3.5 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{query.data.creators.map((creator) => <tr className="hover:bg-slate-50/70" key={creator.id}><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">{creator.zooName.slice(0, 2)}</div><div><p className="font-semibold text-slate-800">{creator.zooName}</p><p className="mt-0.5 text-xs text-slate-500">{creator.email}</p></div></div></td><td className="px-5 py-4 text-slate-600">{creator.managerName}</td><td className="px-5 py-4 text-slate-500">{formatDate(creator.issuedAt)}</td><td className="px-5 py-4 text-right font-semibold">{creator.supporterCount.toLocaleString()}人</td><td className="px-5 py-4"><StatusBadge tone={creator.status === 'active' ? 'green' : 'red'}>{creator.status === 'active' ? '有効' : '停止中'}</StatusBadge></td><td className="px-6 py-4 text-right"><button className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${creator.status === 'active' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: creator.id, status: creator.status === 'active' ? 'suspended' : 'active' })} type="button">{creator.status === 'active' ? '停止する' : '再開する'}</button></td></tr>)}</tbody></table></div>}</AdminCard>

      {showForm && <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-6 backdrop-blur-sm" role="dialog"><div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl">{issued ? <div><div className="grid size-12 place-items-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">✓</div><h2 className="mt-5 text-xl font-bold">Creatorを発行しました</h2><p className="mt-2 text-sm leading-6 text-slate-500">以下のログイン情報をCreator担当者へ安全な方法で共有してください。</p><div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-5 text-sm"><div><p className="text-xs font-medium text-slate-500">動物園名</p><p className="mt-1 font-semibold">{issued.creator.zooName}</p></div><div><p className="text-xs font-medium text-slate-500">メールアドレス</p><p className="mt-1 font-mono font-semibold">{issued.creator.email}</p></div><div><p className="text-xs font-medium text-slate-500">初期パスワード</p><p className="mt-1 font-mono font-semibold">{issued.temporaryPassword}</p></div></div><button className="mt-5 h-11 w-full rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => void copyCredentials()} type="button">{copied ? 'コピーしました' : 'ログイン情報をコピー'}</button><button className="mt-3 h-11 w-full rounded-xl bg-slate-950 text-sm font-bold text-white" onClick={closeDialog} type="button">閉じる</button></div> : <div><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">Creatorアカウントを発行</h2><p className="mt-1.5 text-sm text-slate-500">動物園担当者のログイン情報を設定します。</p></div><button aria-label="閉じる" className="grid size-9 place-items-center rounded-lg text-xl text-slate-400 hover:bg-slate-100" onClick={closeDialog} type="button">×</button></div><form className="mt-7 space-y-4" noValidate onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>{([{ key: 'zooName', label: '動物園名', placeholder: '例：多摩動物公園', type: 'text' }, { key: 'managerName', label: '担当者名', placeholder: '例：山田 太郎', type: 'text' }, { key: 'email', label: 'メールアドレス', placeholder: 'creator@example.jp', type: 'email' }, { key: 'password', label: '初期パスワード', placeholder: '8文字以上', type: 'password' }] as const).map((field) => <div key={field.key}><label className="text-sm font-semibold text-slate-700" htmlFor={`creator-${field.key}`}>{field.label}</label><input {...form.register(field.key)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100" id={`creator-${field.key}`} placeholder={field.placeholder} type={field.type} />{form.formState.errors[field.key] && <p className="mt-1 text-xs text-red-600">{form.formState.errors[field.key]?.message}</p>}</div>)}{createMutation.isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">発行できませんでした。メールアドレスを確認してください。</p>}<div className="flex justify-end gap-3 pt-3"><button className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700" onClick={closeDialog} type="button">キャンセル</button><button className="h-11 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white disabled:opacity-60" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? '発行中...' : 'アカウントを発行'}</button></div></form></div>}</div></div>}
    </div>
  )
}
