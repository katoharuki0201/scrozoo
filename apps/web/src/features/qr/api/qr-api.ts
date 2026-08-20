import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import {
  createdGalleryPostSchema,
  qrVisitSessionSchema,
  type GalleryPostRequest,
} from '../model/qr'

export async function verifyQrCode(payload: string) {
  return qrVisitSessionSchema.parse(
    await api.post<unknown>('qr/verify', { payload }),
  )
}

export async function getQrVisitSession(sessionId: string) {
  return qrVisitSessionSchema.parse(
    await api.get<unknown>(`qr/sessions/${sessionId}`),
  )
}

export async function createGalleryPost(request: GalleryPostRequest) {
  return createdGalleryPostSchema.parse(
    await api.post<unknown>('gallery/posts', request),
  )
}

export function qrVisitSessionQueryOptions(sessionId: string) {
  return queryOptions({
    queryKey: ['qr', 'session', sessionId],
    queryFn: () => getQrVisitSession(sessionId),
    retry: false,
  })
}
