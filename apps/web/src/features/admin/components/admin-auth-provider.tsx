import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, type PropsWithChildren } from 'react'
import { getAdminSession, logoutAdmin } from '../api/admin-api'
import { AdminAuthContext } from '../model/admin-auth-context'
import type { AdminSession } from '../model/admin'

const adminSessionQueryKey = ['admin', 'session'] as const

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const hasToken = Boolean(localStorage.getItem('admin-token'))
  const sessionQuery = useQuery({
    queryKey: adminSessionQueryKey,
    queryFn: getAdminSession,
    enabled: hasToken,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (sessionQuery.isError) {
      localStorage.removeItem('admin-token')
      queryClient.setQueryData(adminSessionQueryKey, null)
    }
  }, [queryClient, sessionQuery.isError])

  function authenticate(session: AdminSession) {
    localStorage.setItem('admin-token', session.token)
    queryClient.setQueryData(adminSessionQueryKey, session.admin)
  }

  async function logout() {
    try {
      await logoutAdmin()
    } finally {
      localStorage.removeItem('admin-token')
      queryClient.setQueryData(adminSessionQueryKey, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] !== 'session' })
    }
  }

  return (
    <AdminAuthContext.Provider value={{
      admin: sessionQuery.data ?? null,
      isInitializing: hasToken && sessionQuery.isPending,
      authenticate,
      logout,
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
