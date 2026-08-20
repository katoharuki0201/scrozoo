import type { PropsWithChildren, ReactNode } from 'react'

export function AdminPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function AdminCard({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>
}

export function QueryState({ loading, error }: { loading: boolean; error: boolean }) {
  if (loading) return <div className="grid min-h-64 place-items-center text-sm text-slate-500">データを読み込んでいます...</div>
  if (error) return <div className="grid min-h-64 place-items-center rounded-2xl border border-red-200 bg-red-50 text-sm text-red-700">データを取得できませんでした。</div>
  return null
}

export function StatusBadge({ children, tone = 'slate' }: PropsWithChildren<{ tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }>) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${colors[tone]}`}>{children}</span>
}

export function EmptyState({ children }: PropsWithChildren) {
  return <div className="grid min-h-48 place-items-center px-6 text-center text-sm text-slate-500">{children}</div>
}
