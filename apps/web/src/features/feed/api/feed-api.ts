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
  if (values.tipAmount > 0) {
    const checkout = z.object({ checkoutUrl: z.url(), mode: z.literal('mock') }).parse(
      await api.post<unknown>(`videos/${videoId}/tip-checkout`, {
        amount: values.tipAmount,
        comment: values.message,
      }),
    )
    window.location.assign(checkout.checkoutUrl)
    return new Promise<never>(() => undefined)
  }
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
