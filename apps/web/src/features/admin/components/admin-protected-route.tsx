import { Navigate, Outlet, useLocation } from 'react-router'
import { useAdminAuth } from '../hooks/use-admin-auth'

export function AdminProtectedRoute() {
  const { admin, isInitializing } = useAdminAuth()
  const location = useLocation()

  if (isInitializing) return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">管理画面を読み込んでいます...</div>
  if (!admin) return <Navigate replace state={{ from: location.pathname }} to="/admin/login" />

  return <Outlet />
}
