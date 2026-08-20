import { z } from 'zod'

export const uploadPurposeSchema = z.enum([
  'avatar',
  'zooProfile',
  'animalProfile',
  'galleryImage',
  'videoPreview',
  'video',
])

export type UploadPurpose = z.infer<typeof uploadPurposeSchema>

export const uploadTicketSchema = z.object({
  uploadId: z.string(),
  uploadUrl: z.url(),
  objectKey: z.string(),
  expiresAt: z.string(),
  headers: z.record(z.string(), z.string()),
})

export const completedUploadSchema = z.object({
  uploadId: z.string(),
  objectKey: z.string(),
  status: z.literal('ready'),
})
