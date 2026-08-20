import { z } from 'zod'

export const creatorSupporterSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  joinedAt: z.string(),
  nextRenewalDate: z.string(),
  status: z.enum(['active', 'cancel_scheduled']),
})

export const creatorSupportersSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  monthlySupportAmount: z.number().int().nonnegative(),
  supporters: z.array(creatorSupporterSchema),
})

export type CreatorSupporter = z.infer<typeof creatorSupporterSchema>
