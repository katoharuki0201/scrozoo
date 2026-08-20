import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { profileSchema } from '../model/profile'

export async function getMyProfile() {
  return profileSchema.parse(await api.get<unknown>('profiles/me'))
}

export async function getZooProfile(zooId: string) {
  return profileSchema.parse(await api.get<unknown>(`zoos/${zooId}/profile`))
}

export const myProfileQueryOptions = queryOptions({
  queryKey: ['profile', 'me'],
  queryFn: getMyProfile,
})

export function zooProfileQueryOptions(zooId: string) {
  return queryOptions({
    queryKey: ['profile', 'zoo', zooId],
    queryFn: () => getZooProfile(zooId),
  })
}
