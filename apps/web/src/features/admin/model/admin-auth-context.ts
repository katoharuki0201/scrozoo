import { createContext } from 'react'
import type { AdminSession, AdminUser } from './admin'

export type AdminAuthContextValue = {
  admin: AdminUser | null
  isInitializing: boolean
  authenticate: (session: AdminSession) => void
  logout: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
