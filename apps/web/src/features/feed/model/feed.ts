import { z } from 'zod'

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
  isLiked: z.boolean(),
})

export const feedSchema = z.array(feedVideoSchema)

export type FeedVideo = z.infer<typeof feedVideoSchema>
