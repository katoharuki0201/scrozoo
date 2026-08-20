import { z } from 'zod'

export const accountRoleSchema = z.enum(['viewer', 'creator'])

export const profileVideoSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  videoUrl: z.string(),
  title: z.string(),
  viewCount: z.number().int().nonnegative(),
  thumbnailTime: z.number().nonnegative(),
})

export const galleryPostSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string(),
  createdAt: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
  zoo: z.object({
    id: z.string(),
    name: z.string(),
  }),
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
  videos: z.array(profileVideoSchema),
  galleryPosts: z.array(galleryPostSchema),
})

export type AccountRole = z.infer<typeof accountRoleSchema>
export type Profile = z.infer<typeof profileSchema>
export type ProfileVideo = z.infer<typeof profileVideoSchema>
export type GalleryPost = z.infer<typeof galleryPostSchema>
export type ProfileViewMode = 'self' | 'public'
