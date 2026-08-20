import { z } from 'zod'

export const accountRoleSchema = z.enum(['viewer', 'creator'])

export const profileMediaSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  videoUrl: z.string(),
  title: z.string(),
  viewCount: z.number().int().nonnegative(),
  thumbnailTime: z.number().nonnegative(),
})

export const profileSchema = z.object({
  id: z.string(),
  accountRole: accountRoleSchema,
  name: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string(),
  videoCount: z.number().int().nonnegative().nullable(),
  supporterCount: z.number().int().nonnegative().nullable(),
  supportPrice: z.number().int().positive().nullable(),
  media: z.array(profileMediaSchema),
  supporterMedia: z.array(profileMediaSchema),
})

export type AccountRole = z.infer<typeof accountRoleSchema>
export type Profile = z.infer<typeof profileSchema>
export type ProfileMedia = z.infer<typeof profileMediaSchema>
export type ProfileViewMode = 'self' | 'public'
