import { z } from 'zod'
import { supportGoalSchema } from '../../support-goal/model/support-goal'

export const feedVideoSchema = z.object({
  id: z.string(),
  videoUrl: z.string(),
  zoo: z.object({
    id: z.string(),
    name: z.string(),
    avatarUrl: z.string(),
  }),
  caption: z.string(),
  tags: z.array(z.string()),
  likeCount: z.number(),
  commentCount: z.number(),
  supportPrice: z.number(),
  hasActiveSupportPlan: z.boolean(),
  supportGoal: supportGoalSchema.nullable(),
  isLiked: z.boolean(),
})

export const feedSchema = z.array(feedVideoSchema)

export type FeedVideo = z.infer<typeof feedVideoSchema>

export const feedCommentSchema = z.object({
  id: z.string(),
  author: z.object({
    name: z.string(),
    initials: z.string(),
  }),
  message: z.string(),
  isSupporter: z.boolean(),
  tipAmount: z.number(),
  createdAt: z.string(),
})

export const feedCommentsSchema = z.array(feedCommentSchema)

export const createCommentSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください。')
    .max(200, 'コメントは200文字以内で入力してください。'),
  tipAmount: z.number().int().refine((amount) => amount === 0 || (amount >= 100 && amount <= 3000), '100円〜3,000円で指定してください。'),
})

export type FeedComment = z.infer<typeof feedCommentSchema>
export type CreateCommentValues = z.infer<typeof createCommentSchema>
