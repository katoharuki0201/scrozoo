import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/use-auth'

export function CreatorOnlyRoute() {
  const { user } = useAuth()

  if (user?.role !== 'creator') {
    return <Navigate replace to="/mypage" />
  }

  return <Outlet />
}
