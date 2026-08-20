import { z } from 'zod'
import { api } from '../../../shared/lib/api'
import {
  authSessionSchema,
  type LoginFormValues,
  type RegistrationFormValues,
  userSchema,
} from '../model/auth'

const betterAuthUserSchema = userSchema.extend({
  image: z.string().nullable().optional(),
  role: z.string().optional(),
}).omit({ avatarUrl: true, plan: true })

const betterAuthResponseSchema = z.object({
  user: betterAuthUserSchema,
})

function toAuthSession(response: unknown) {
  const { user } = betterAuthResponseSchema.parse(response)

  return authSessionSchema.parse({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.image ?? null,
      plan: 'free',
      role: user.role === 'creator' || user.role === 'publisher' ? 'creator' : 'viewer',
    },
  })
}

export async function loginWithEmail(values: LoginFormValues) {
  const response = await api.post<unknown>('auth/sign-in/email', values)

  return toAuthSession(response)
}

export async function loginWithGoogle() {
  const response = z.object({ url: z.string() }).parse(
    await api.post<unknown>('auth/sign-in/social', {
      provider: 'google',
      callbackURL: window.location.origin,
    }),
  )

  window.location.assign(response.url)
  return new Promise<never>(() => undefined)
}

export async function registerWithEmail(values: RegistrationFormValues) {
  const response = await api.post<unknown>('auth/sign-up/email', values)

  return toAuthSession(response)
}

export async function registerWithGoogle() {
  return loginWithGoogle()
}

export async function getSession() {
  const response = await api.get<unknown>('auth/get-session')

  if (response === null) return null

  return toAuthSession(response).user
}

export async function logoutSession() {
  await api.post<void>('auth/sign-out')
}
