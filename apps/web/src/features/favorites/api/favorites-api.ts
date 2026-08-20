import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { favoriteVideosSchema, type FavoriteSort } from '../model/favorite'

export async function getFavoriteVideos(sort: FavoriteSort) {
  return favoriteVideosSchema.parse(
    await api.get<unknown>('favorites', { searchParams: { sort } }),
  )
}

export function favoriteVideosQueryOptions(sort: FavoriteSort) {
  return queryOptions({
    queryKey: ['favorites', sort],
    queryFn: () => getFavoriteVideos(sort),
  })
}
