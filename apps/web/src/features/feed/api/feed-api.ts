import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../../shared/lib/api'
import {
  feedCommentSchema,
  feedCommentsSchema,
  feedSchema,
  type CreateCommentValues,
} from '../model/feed'

export async function getFeed() {
  const response = await api.get<unknown>('feed')

  return feedSchema.parse(response)
}

export async function toggleVideoLike(videoId: string) {
  const response = await api.post<unknown>(`feed/${videoId}/like`)

  return z.object({ isLiked: z.boolean() }).parse(response)
}

export async function getVideoComments(videoId: string) {
  const response = await api.get<unknown>(`feed/${videoId}/comments`)

  return feedCommentsSchema.parse(response)
}

export async function createVideoComment(
  videoId: string,
  values: CreateCommentValues,
) {
  const response = await api.post<unknown>(`feed/${videoId}/comments`, values)

  return feedCommentSchema.parse(response)
}

export function videoCommentsQueryOptions(videoId: string) {
  return queryOptions({
    queryKey: ['feed', videoId, 'comments'],
    queryFn: () => getVideoComments(videoId),
  })
}

export const feedQueryOptions = queryOptions({
  queryKey: ['feed'],
  queryFn: getFeed,
})
