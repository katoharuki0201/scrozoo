import { z } from 'zod'

export const MAX_VIDEO_SIZE = 200 * 1024 * 1024

export function parseTags(value: string) {
  return [...new Set(
    value
      .split(/[\s,、#]+/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  )]
}

export const creatorPostFormSchema = z.object({
  animalId: z.string().min(1, '対象の動物を選択してください。'),
  video: z
    .instanceof(File, { error: '投稿する動画を選択してください。' })
    .refine((file) => ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type), 'MP4・WebM・MOV動画を選択してください。')
    .refine((file) => file.size <= MAX_VIDEO_SIZE, '動画は200MB以下のファイルを選択してください。'),
  caption: z
    .string()
    .trim()
    .min(1, 'キャプションを入力してください。')
    .max(120, 'キャプションは120文字以内で入力してください。'),
  tagsText: z
    .string()
    .refine((value) => parseTags(value).length <= 5, 'タグは5件まで設定できます。')
    .refine((value) => parseTags(value).every((tag) => tag.length <= 20), 'タグは1件20文字以内で入力してください。'),
})

export type CreatorPostFormValues = z.infer<typeof creatorPostFormSchema>
