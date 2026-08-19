import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  plan: z.enum(['free', 'supporter']),
})

export const authSessionSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export const loginFormSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください。'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください。'),
})

export type User = z.infer<typeof userSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type LoginFormValues = z.infer<typeof loginFormSchema>
