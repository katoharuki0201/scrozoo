import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { creatorSupportersSummarySchema } from '../model/creator-supporter'

export async function getCreatorSupporters() {
  return creatorSupportersSummarySchema.parse(
    await api.get<unknown>('creator/supporters'),
  )
}

export const creatorSupportersQueryOptions = queryOptions({
  queryKey: ['creator', 'supporters'],
  queryFn: getCreatorSupporters,
})
