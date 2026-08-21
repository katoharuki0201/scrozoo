import { z } from 'zod'

export const supportPlanSchema = z.object({
  id: z.string(),
  zoo: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string(),
  }),
  nextRenewalDate: z.string(),
  status: z.enum(['active', 'cancel_scheduled']),
})

export const supportPlansSchema = z.array(supportPlanSchema)

export const mockCheckoutSchema = z.object({
  checkoutUrl: z.url(),
  mode: z.literal('mock'),
})

export type SupportPlan = z.infer<typeof supportPlanSchema>
