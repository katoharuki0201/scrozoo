import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { getSession, logoutSession } from '../api/auth-api'
import { AuthContext } from '../model/auth-context'
import type { AuthSession } from '../model/auth'

const sessionQueryKey = ['auth', 'session'] as const

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const hasToken = Boolean(localStorage.getItem('token'))
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    enabled: hasToken,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (sessionQuery.isError) {
      localStorage.removeItem('token')
      queryClient.setQueryData(sessionQueryKey, null)
    }
  }, [queryClient, sessionQuery.isError])

  function authenticate(session: AuthSession) {
    localStorage.setItem('token', session.token)
    queryClient.setQueryData(sessionQueryKey, session.user)
  }

  async function logout() {
    try {
      await logoutSession()
    } finally {
      localStorage.removeItem('token')
      queryClient.setQueryData(sessionQueryKey, null)
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      })
    }
  }

  const user = sessionQuery.data ?? null
  const isInitializing = hasToken && sessionQuery.isPending

  return (
    <AuthContext.Provider
      value={{ user, isInitializing, authenticate, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
