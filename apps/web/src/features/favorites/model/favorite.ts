import { z } from 'zod'

export const favoriteSortSchema = z.enum(['latest', 'popular', 'oldest'])

export const favoriteVideoSchema = z.object({
  id: z.string(),
  videoUrl: z.string(),
  title: z.string(),
  viewCount: z.number().int().nonnegative(),
  thumbnailTime: z.number().nonnegative(),
  publishedAt: z.string(),
})

export const favoriteVideosSchema = z.array(favoriteVideoSchema)

export type FavoriteSort = z.infer<typeof favoriteSortSchema>
