import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import type { SVGProps } from 'react'
import { useAdminAuth } from '../hooks/use-admin-auth'

const navItems = [
  { to: '/admin', label: 'ダッシュボード', icon: 'dashboard', end: true },
  { to: '/admin/users', label: 'ユーザー管理', icon: 'users' },
  { to: '/admin/subscribers', label: 'プラン加入者', icon: 'subscription' },
  { to: '/admin/revenue', label: '収益管理', icon: 'revenue' },
  { to: '/admin/creators', label: 'Creator管理', icon: 'creator' },
]

function AdminNavIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8, viewBox: '0 0 24 24' }
  if (name === 'dashboard') return <svg {...common} {...props}><rect height="7" rx="1.5" width="7" x="3" y="3" /><rect height="7" rx="1.5" width="7" x="14" y="3" /><rect height="7" rx="1.5" width="7" x="3" y="14" /><rect height="7" rx="1.5" width="7" x="14" y="14" /></svg>
  if (name === 'users') return <svg {...common} {...props}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3.5 3.5 0 0 1 0 6.5M17 15a5.5 5.5 0 0 1 4.5 5" /></svg>
  if (name === 'subscription') return <svg {...common} {...props}><rect height="17" rx="2" width="14" x="5" y="4" /><path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h4" /></svg>
  if (name === 'revenue') return <svg {...common} {...props}><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /><path d="m4 7 5-4 6 5 5-4" /></svg>
  return <svg {...common} {...props}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M18 8v6m-3-3h6" /></svg>
}

const titles: Record<string, string> = {
  '/admin': 'ダッシュボード',
  '/admin/users': 'ユーザー管理',
  '/admin/subscribers': 'プラン加入者',
  '/admin/revenue': '収益管理',
  '/admin/creators': 'Creator管理',
}

export function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    void navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-sky-500 font-black">S</div>
          <div><p className="font-bold tracking-tight">SCROZOO</p><p className="text-[11px] font-medium tracking-widest text-slate-400">ADMIN CONSOLE</p></div>
        </div>
        <nav aria-label="管理メニュー" className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${isActive ? 'bg-sky-500 text-white shadow-lg shadow-sky-950/20' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
              end={item.end}
              key={item.to}
              to={item.to}
            >
              <span className="grid size-7 place-items-center rounded-lg bg-white/10" aria-hidden="true"><AdminNavIcon className="size-4" name={item.icon} /></span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="grid size-9 place-items-center rounded-full bg-slate-700 text-xs font-bold">AD</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{admin?.name}</p><p className="truncate text-xs text-slate-400">{admin?.email}</p></div>
          </div>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-400 transition hover:bg-slate-900 hover:text-white" onClick={handleLogout} type="button">ログアウト</button>
        </div>
      </aside>
      <div className="pl-64">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
          <p className="font-semibold text-slate-700">{titles[location.pathname] ?? '管理画面'}</p>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"><span className="size-2 rounded-full bg-emerald-500" />管理者としてログイン中</div>
        </header>
        <main className="mx-auto max-w-[1440px] p-8"><Outlet /></main>
      </div>
    </div>
  )
}
