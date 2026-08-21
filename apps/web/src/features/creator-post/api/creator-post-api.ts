import { api } from '../../../shared/lib/api'
import { feedVideoSchema } from '../../feed/model/feed'
import { parseTags, type CreatorPostFormValues } from '../model/creator-post'
import { uploadFile } from '../../upload/api/upload-api'
import { createVideoPreview, inspectVideo } from '../lib/video'

type CreatePostOptions = {
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

export async function createCreatorPost(values: CreatorPostFormValues, options: CreatePostOptions = {}) {
  const [{ durationMs }, preview] = await Promise.all([
    inspectVideo(values.video),
    createVideoPreview(values.video),
  ])
  options.onProgress?.(0.05)
  const [fullUpload, previewUpload] = await Promise.all([
    uploadFile(values.video, 'video', {
      signal: options.signal,
      onProgress: (value) => options.onProgress?.(0.05 + value * 0.7),
    }),
    uploadFile(preview, 'videoPreview', {
      signal: options.signal,
      onProgress: (value) => options.onProgress?.(0.05 + value * 0.2),
    }),
  ])
  options.onProgress?.(0.95)

  return feedVideoSchema.parse(
    await api.post<unknown>('creator/posts', {
      videoUploadId: fullUpload.uploadId,
      previewUploadId: previewUpload.uploadId,
      durationMs,
      animalId: values.animalId,
      caption: values.caption.trim(),
      tags: parseTags(values.tagsText),
    }, { signal: options.signal }),
  )
}
