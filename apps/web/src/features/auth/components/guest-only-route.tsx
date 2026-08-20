import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/use-auth'
import { AuthLoadingScreen } from './auth-loading-screen'

export function GuestOnlyRoute() {
  const { isInitializing, user } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <AuthLoadingScreen />
  }

  if (user) {
    const from =
      typeof location.state === 'object' &&
      location.state !== null &&
      'from' in location.state &&
      typeof location.state.from === 'string' &&
      location.state.from.startsWith('/')
        ? location.state.from
        : '/'

    return <Navigate replace to={from} />
  }

  return <Outlet />
}
