import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { searchVideosSchema, type SearchSort } from '../model/search'

export async function searchVideos(query: string, sort: SearchSort) {
  const response = await api.get<unknown>('search/videos', {
    searchParams: { q: query, sort },
  })

  return searchVideosSchema.parse(response)
}

export function searchVideosQueryOptions(query: string, sort: SearchSort) {
  return queryOptions({
    queryKey: ['search', 'videos', query, sort],
    queryFn: () => searchVideos(query, sort),
  })
}
