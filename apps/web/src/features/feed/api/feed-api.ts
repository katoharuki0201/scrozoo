import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../../shared/lib/api'
import { feedSchema } from '../model/feed'

export async function getFeed() {
  const response = await api.get<unknown>('feed')

  return feedSchema.parse(response)
}

export async function toggleVideoLike(videoId: string) {
  const response = await api.post<unknown>(`feed/${videoId}/like`)

  return z.object({ isLiked: z.boolean() }).parse(response)
}

export const feedQueryOptions = queryOptions({
  queryKey: ['feed'],
  queryFn: getFeed,
})
