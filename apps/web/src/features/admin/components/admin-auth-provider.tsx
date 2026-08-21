import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, type PropsWithChildren } from 'react'
import { getAdminSession, logoutAdmin } from '../api/admin-api'
import { AdminAuthContext } from '../model/admin-auth-context'
import type { AdminSession } from '../model/admin'

const adminSessionQueryKey = ['admin', 'session'] as const

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const sessionQuery = useQuery({
    queryKey: adminSessionQueryKey,
    queryFn: getAdminSession,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (sessionQuery.isError) {
      queryClient.setQueryData(adminSessionQueryKey, null)
    }
  }, [queryClient, sessionQuery.isError])

  function authenticate(session: AdminSession) {
    queryClient.setQueryData(adminSessionQueryKey, session.admin)
  }

  async function logout() {
    try {
      await logoutAdmin()
    } finally {
      queryClient.setQueryData(adminSessionQueryKey, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] !== 'session' })
    }
  }

  return (
    <AdminAuthContext.Provider value={{
      admin: sessionQuery.data ?? null,
      isInitializing: sessionQuery.isPending,
      authenticate,
      logout,
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
