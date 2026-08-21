import { z } from 'zod'

export const creatorVisitQrSchema = z.object({
  payload: z.string().min(1),
  expiresAt: z.string().nullable(),
  zoo: z.object({
    id: z.string(),
    name: z.string(),
  }),
})

export type CreatorVisitQr = z.infer<typeof creatorVisitQrSchema>
