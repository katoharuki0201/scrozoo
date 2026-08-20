import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from '../features/auth/components/auth-provider'
import { AdminAuthProvider } from '../features/admin/components/admin-auth-provider'
import { queryClient } from '../shared/lib/query-client'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminAuthProvider>
          <AuthProvider>{children}</AuthProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
