import { z } from 'zod'
import { galleryPostSchema } from '../../profile/model/profile'

export const qrVisitSessionSchema = z.object({
  sessionId: z.string(),
  zoo: z.object({
    id: z.string(),
    name: z.string(),
  }),
  expiresAt: z.string(),
})

export const galleryPostRequestSchema = z.object({
  sessionId: z.string(),
  imageDataUrl: z.string().startsWith('data:image/'),
})

export type QrVisitSession = z.infer<typeof qrVisitSessionSchema>
export type GalleryPostRequest = z.infer<typeof galleryPostRequestSchema>
export const createdGalleryPostSchema = galleryPostSchema
