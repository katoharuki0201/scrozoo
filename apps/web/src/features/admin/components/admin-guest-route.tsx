import { Navigate, Outlet } from 'react-router'
import { useAdminAuth } from '../hooks/use-admin-auth'

export function AdminGuestRoute() {
  const { admin, isInitializing } = useAdminAuth()

  if (isInitializing) return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">管理画面を読み込んでいます...</div>
  if (admin) return <Navigate replace to="/admin" />

  return <Outlet />
}
