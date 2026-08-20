import { api } from '../../../shared/lib/api'
import {
  authSessionSchema,
  type LoginFormValues,
  type RegistrationFormValues,
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

export async function registerWithEmail(values: RegistrationFormValues) {
  const response = await api.post<unknown>('auth/register', values)

  return authSessionSchema.parse(response)
}

export async function registerWithGoogle() {
  const response = await api.post<unknown>('auth/register/google')

  return authSessionSchema.parse(response)
}

export async function getSession() {
  const response = await api.get<unknown>('auth/session')

  return userSchema.parse(response)
}

export async function logoutSession() {
  await api.post<void>('auth/logout')
}
