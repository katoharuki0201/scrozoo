import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/use-auth'

export function ViewerOnlyRoute() {
  const { user } = useAuth()

  if (user?.role !== 'viewer') {
    return <Navigate replace to="/mypage" />
  }

  return <Outlet />
}
