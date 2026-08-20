import { z } from 'zod'

export const searchSortSchema = z.enum(['latest', 'popular', 'oldest'])

export const searchVideoSchema = z.object({
  id: z.string(),
  videoUrl: z.string(),
  title: z.string(),
  viewCount: z.number().int().nonnegative(),
  thumbnailTime: z.number().nonnegative(),
  publishedAt: z.string(),
})

export const searchVideosSchema = z.array(searchVideoSchema)

export type SearchSort = z.infer<typeof searchSortSchema>
export type SearchVideo = z.infer<typeof searchVideoSchema>
