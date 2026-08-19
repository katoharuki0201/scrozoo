import { createContext } from 'react'
import type { AuthSession, User } from './auth'

export type AuthContextValue = {
  user: User | null
  isInitializing: boolean
  authenticate: (session: AuthSession) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
