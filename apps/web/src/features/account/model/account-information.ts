import { z } from 'zod'

export const accountInformationSchema = z.object({
  name: z.string(),
  email: z.email(),
  bio: z.string(),
})

export const accountInformationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'ユーザー名を入力してください。')
    .max(30, 'ユーザー名は30文字以内で入力してください。'),
  email: z
    .string()
    .trim()
    .pipe(z.email('有効なメールアドレスを入力してください。')),
  bio: z
    .string()
    .trim()
    .max(200, '自己紹介は200文字以内で入力してください。'),
})

export type AccountInformation = z.infer<typeof accountInformationSchema>
export type AccountInformationFormValues = z.infer<typeof accountInformationFormSchema>
