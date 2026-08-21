import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import { creatorVisitQrSchema } from '../model/creator-visit-qr'

export async function getCreatorVisitQr() {
  return creatorVisitQrSchema.parse(
    await api.get<unknown>('publisher/visit-qr'),
  )
}

export const creatorVisitQrQueryOptions = queryOptions({
  queryKey: ['publisher', 'visit-qr'],
  queryFn: getCreatorVisitQr,
  staleTime: Number.POSITIVE_INFINITY,
})
