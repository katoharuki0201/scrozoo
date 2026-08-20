import { z } from 'zod'

export const supportGoalStatusSchema = z.enum(['active', 'achieved', 'expired'])

export const supportGoalSchema = z.object({
  id: z.string(),
  zooId: z.string(),
  title: z.string(),
  targetAmount: z.number().int().positive(),
  currentAmount: z.number().int().nonnegative(),
  deadline: z.string(),
  status: supportGoalStatusSchema,
})

export const supportGoalFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '目標タイトルを入力してください。')
    .max(50, '目標タイトルは50文字以内で入力してください。'),
  targetAmount: z
    .number({ error: '目標金額を入力してください。' })
    .int('目標金額は整数で入力してください。')
    .min(500, '目標金額は500円以上で設定してください。'),
  deadline: z.string().min(1, '期限を選択してください。'),
}).refine(
  ({ deadline }) => new Date(`${deadline}T23:59:59`) > new Date(),
  { message: '期限は明日以降の日付を選択してください。', path: ['deadline'] },
)

export type SupportGoal = z.infer<typeof supportGoalSchema>
export type SupportGoalFormValues = z.infer<typeof supportGoalFormSchema>
