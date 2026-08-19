import { api } from '../../../shared/lib/api'
import {
  authSessionSchema,
  type LoginFormValues,
  userSchema,
} from '../model/auth'

export async function loginWithEmail(values: LoginFormValues) {
  const response = await api.post<unknown>('auth/login', values)

  return authSessionSchema.parse(response)
}

export async function loginWithGoogle() {
  const response = await api.post<unknown>('auth/google')

  return authSessionSchema.parse(response)
}

export async function getSession() {
  const response = await api.get<unknown>('auth/session')

  return userSchema.parse(response)
}

export async function logoutSession() {
  await api.post<void>('auth/logout')
}
