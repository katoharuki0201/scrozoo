import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/use-auth'
import { AuthLoadingScreen } from './auth-loading-screen'

export function GuestOnlyRoute() {
  const { isInitializing, user } = useAuth()

  if (isInitializing) {
    return <AuthLoadingScreen />
  }

  if (user) {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}
