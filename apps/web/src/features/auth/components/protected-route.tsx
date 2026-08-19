import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/use-auth'
import { AuthLoadingScreen } from './auth-loading-screen'

export function ProtectedRoute() {
  const { isInitializing, user } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return <Outlet />
}
