import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/hooks/use-auth'
import { createCreatorPost } from '../features/creator-post/api/creator-post-api'
import {
  creatorPostFormSchema,
  parseTags,
  type CreatorPostFormValues,
} from '../features/creator-post/model/creator-post'
import { feedQueryOptions } from '../features/feed/api/feed-api'
import type { FeedVideo } from '../features/feed/model/feed'
import { myProfileQueryOptions } from '../features/profile/api/profile-api'
import type { Profile } from '../features/profile/model/profile'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import {
  ChevronLeftIcon,
  TrashIcon,
  UploadIcon,
} from '../shared/ui/icons'

export function CreatorPostCreationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const form = useForm<CreatorPostFormValues>({
    resolver: zodResolver(creatorPostFormSchema),
    defaultValues: { caption: '', tagsText: '' },
  })
  const videoField = form.register('video')
  const caption = useWatch({ control: form.control, name: 'caption' }) ?? ''
  const tagsText = useWatch({ control: form.control, name: 'tagsText' }) ?? ''
  const parsedTags = parseTags(tagsText)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function selectVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    form.setValue('video', file, { shouldDirty: true, shouldValidate: true })
    setPreviewUrl(URL.createObjectURL(file))
  }

  function removeVideo() {
    form.resetField('video')
    setPreviewUrl(null)
  }

  const postMutation = useMutation({
    mutationFn: (values: CreatorPostFormValues) => {
      const controller = new AbortController()
      uploadAbortRef.current = controller
      setUploadProgress(0)
      return createCreatorPost(values, {
        signal: controller.signal,
        onProgress: setUploadProgress,
      })
    },
    onSuccess: (createdVideo) => {
      queryClient.setQueryData<FeedVideo[]>(feedQueryOptions.queryKey, (videos) => [
        createdVideo,
        ...(videos ?? []),
      ])
      queryClient.setQueryData<Profile>(myProfileQueryOptions.queryKey, (profile) => {
        if (!profile) return profile

        return {
          ...profile,
          videoCount: (profile.videoCount ?? profile.videos.length) + 1,
          videos: [
            {
              id: createdVideo.id,
              videoId: createdVideo.id,
              videoUrl: createdVideo.videoUrl,
              title: createdVideo.caption,
              viewCount: 0,
              thumbnailTime: 0,
            },
            ...profile.videos,
          ],
        }
      })
      queryClient.removeQueries({ queryKey: ['profile', 'zoo', createdVideo.zoo.id] })
      void navigate('/mypage?videoPosted=1', { replace: true })
    },
    onSettled: () => { uploadAbortRef.current = null },
  })

  if (user?.role !== 'creator') {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 px-8 text-center shadow-2xl">
        <div>
          <h1 className="text-lg font-black text-slate-800">動物園アカウント専用のページです</h1>
          <Link className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" to="/mypage">マイページに戻る</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex min-h-14 items-center">
          <Link aria-label="マイページに戻る" className="grid size-12 place-items-center rounded-full text-slate-800 active:bg-slate-200" to="/mypage">
            <ChevronLeftIcon className="size-9" />
          </Link>
          <h1 className="ml-2 text-xl font-black text-slate-800">動画を投稿</h1>
        </header>

        <form className="mt-5 space-y-6" noValidate onSubmit={form.handleSubmit((values) => postMutation.mutate(values))}>
          <section>
            <p className="text-sm font-black text-slate-700">動画</p>
            {previewUrl ? (
              <div className="relative mx-auto mt-3 aspect-[9/16] max-h-[48dvh] overflow-hidden rounded-3xl bg-black shadow-lg">
                <video className="size-full object-contain" controls playsInline src={previewUrl} />
                <button aria-label="選択した動画を削除" className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm" onClick={removeVideo} type="button">
                  <TrashIcon className="size-5" />
                </button>
              </div>
            ) : (
              <label className="mt-3 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 text-center active:bg-slate-100" htmlFor="creator-post-video">
                <span className="grid size-14 place-items-center rounded-full bg-slate-900 text-white"><UploadIcon className="size-7" /></span>
                <span className="mt-4 text-base font-black text-slate-800">投稿する動画を選択</span>
                <span className="mt-2 text-xs leading-5 text-slate-500">MP4・WebM・MOV / 最大200MB</span>
              </label>
            )}
            <input {...videoField} accept="video/mp4,video/webm,video/quicktime" className="sr-only" id="creator-post-video" onChange={selectVideo} type="file" />
            {form.formState.errors.video && <p className="mt-2 text-sm font-bold text-red-600" role="alert">{form.formState.errors.video.message}</p>}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-slate-700" htmlFor="creator-post-caption">キャプション</label>
              <span className="text-xs font-bold text-slate-400">{caption.length} / 120</span>
            </div>
            <textarea {...form.register('caption')} aria-invalid={Boolean(form.formState.errors.caption)} className="mt-2 min-h-30 w-full resize-none rounded-2xl border border-transparent bg-slate-200 px-4 py-3 text-base leading-6 outline-none transition focus:border-slate-500 focus:bg-white aria-invalid:border-red-400" id="creator-post-caption" maxLength={120} placeholder="動物たちの様子を書いてください" />
            {form.formState.errors.caption && <p className="mt-2 text-sm font-bold text-red-600" role="alert">{form.formState.errors.caption.message}</p>}
          </section>

          <section>
            <label className="text-sm font-black text-slate-700" htmlFor="creator-post-tags">タグ</label>
            <input {...form.register('tagsText')} aria-invalid={Boolean(form.formState.errors.tagsText)} className="mt-2 h-14 w-full rounded-2xl border border-transparent bg-slate-200 px-4 text-base outline-none transition focus:border-slate-500 focus:bg-white aria-invalid:border-red-400" id="creator-post-tags" placeholder="カンガルー 動物の日常" />
            <p className="mt-2 text-xs leading-5 text-slate-500">スペースで区切って5件まで設定できます。</p>
            {parsedTags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{parsedTags.map((tag) => <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700" key={tag}>#{tag}</span>)}</div>}
            {form.formState.errors.tagsText && <p className="mt-2 text-sm font-bold text-red-600" role="alert">{form.formState.errors.tagsText.message}</p>}
          </section>

          {postMutation.isError && <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600" role="alert">動画を投稿できませんでした。</p>}

          {postMutation.isPending && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-sky-500 transition-[width]" style={{ width: `${Math.round(uploadProgress * 100)}%` }} /></div>
              <p className="mt-2 text-center text-xs font-bold text-slate-500">アップロード中 {Math.round(uploadProgress * 100)}%</p>
            </div>
          )}
          <div className="flex gap-3">
            {postMutation.isPending && <button className="h-14 flex-1 rounded-2xl bg-slate-200 text-sm font-black text-slate-700" onClick={() => uploadAbortRef.current?.abort()} type="button">キャンセル</button>}
            <button className="h-14 flex-1 rounded-2xl bg-slate-950 text-base font-black text-white shadow-lg disabled:opacity-50" disabled={postMutation.isPending} type="submit">
              {postMutation.isPending ? '投稿中...' : postMutation.isError ? 'もう一度試す' : '動画を投稿する'}
            </button>
          </div>
        </form>
      </div>
      <BottomNavigation activePath="/mypage/posts/new" />
    </main>
  )
}
