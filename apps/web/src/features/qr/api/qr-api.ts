import { queryOptions } from '@tanstack/react-query'
import { api } from '../../../shared/lib/api'
import {
  createdGalleryPostSchema,
  qrVisitSessionSchema,
  type GalleryPostRequest,
} from '../model/qr'
import { dataUrlToFile, uploadFile } from '../../upload/api/upload-api'

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
  const image = await dataUrlToFile(request.imageDataUrl, 'gallery.jpg')
  const upload = await uploadFile(image, 'galleryImage')
  return createdGalleryPostSchema.parse(
    await api.post<unknown>('gallery/posts', {
      sessionId: request.sessionId,
      imageUploadId: upload.uploadId,
    }),
  )
}

export function qrVisitSessionQueryOptions(sessionId: string) {
  return queryOptions({
    queryKey: ['qr', 'session', sessionId],
    queryFn: () => getQrVisitSession(sessionId),
    retry: false,
  })
}
