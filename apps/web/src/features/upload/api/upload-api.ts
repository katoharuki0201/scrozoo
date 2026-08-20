import { api } from '../../../shared/lib/api'
import {
  completedUploadSchema,
  uploadTicketSchema,
  type UploadPurpose,
} from '../model/upload'

type UploadOptions = {
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

function putFile(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  options: UploadOptions,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value))
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(event.loaded / event.total)
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve()
      else reject(new Error('ファイルをアップロードできませんでした。'))
    }
    request.onerror = () => reject(new Error('ファイルをアップロードできませんでした。'))
    request.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))
    const abort = () => request.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    request.onloadend = () => options.signal?.removeEventListener('abort', abort)
    request.send(file)
  })
}

export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  options: UploadOptions = {},
) {
  const ticket = uploadTicketSchema.parse(await api.post<unknown>('uploads', {
    purpose,
    contentType: file.type,
    size: file.size,
    fileName: file.name,
  }))
  await putFile(ticket.uploadUrl, file, ticket.headers, options)
  options.onProgress?.(1)
  return completedUploadSchema.parse(
    await api.post<unknown>(`uploads/${ticket.uploadId}/complete`),
  )
}

export async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type })
}
