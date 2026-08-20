import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  plan: z.enum(['free', 'supporter']),
  role: z.enum(['viewer', 'creator']),
})

export const authSessionSchema = z.object({
  user: userSchema,
})

export const loginFormSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください。'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください。'),
})

export const registrationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '名前を入力してください。')
    .max(30, '名前は30文字以内で入力してください。'),
  email: z.email('有効なメールアドレスを入力してください。'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください。'),
})

export type User = z.infer<typeof userSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
export type LoginFormValues = z.infer<typeof loginFormSchema>
export type RegistrationFormValues = z.infer<typeof registrationFormSchema>
