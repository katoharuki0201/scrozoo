import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import {
  createVideoComment,
  feedQueryOptions,
  videoCommentsQueryOptions,
} from '../api/feed-api'
import {
  createCommentSchema,
  type CreateCommentValues,
  type FeedComment,
  type FeedVideo,
} from '../model/feed'
import { FeedSheet } from './feed-sheet'

const tipOptions = [0, 100, 300, 500] as const

function CommentCard({ comment }: { comment: FeedComment }) {
  return (
    <article
      className={`flex gap-3 rounded-2xl p-3 ${
        comment.isSupporter
          ? 'border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
          : 'bg-slate-50'
      }`}
    >
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-black ${
          comment.isSupporter
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
            : 'bg-slate-200 text-slate-600'
        }`}
      >
        {comment.author.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold">{comment.author.name}</p>
          {comment.isSupporter && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
              サポーター
            </span>
          )}
          {comment.tipAmount > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              {comment.tipAmount}円応援
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">{comment.message}</p>
      </div>
    </article>
  )
}

type CommentsSheetProps = {
  commentCount: number
  onClose: () => void
  videoId: string
}

export function CommentsSheet({
  commentCount,
  onClose,
  videoId,
}: CommentsSheetProps) {
  const queryClient = useQueryClient()
  const commentsQuery = useQuery(videoCommentsQueryOptions(videoId))
  const form = useForm<CreateCommentValues>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { message: '', tipAmount: 0 },
  })
  const selectedTip = useWatch({
    control: form.control,
    name: 'tipAmount',
  })
  const createComment = useMutation({
    mutationFn: (values: CreateCommentValues) =>
      createVideoComment(videoId, values),
    onSuccess: (comment) => {
      queryClient.setQueryData<FeedComment[]>(
        videoCommentsQueryOptions(videoId).queryKey,
        (current) => [comment, ...(current ?? [])],
      )
      queryClient.setQueryData<FeedVideo[]>(
        feedQueryOptions.queryKey,
        (current) =>
          current?.map((video) =>
            video.id === videoId
              ? { ...video, commentCount: video.commentCount + 1 }
              : video,
          ),
      )
      form.reset({ message: '', tipAmount: 0 })
    },
  })

  return (
    <FeedSheet onClose={onClose} title={`コメント ${commentCount}件`}>
      <div className="mt-4">
        {commentsQuery.isPending && (
          <div className="grid h-28 place-items-center">
            <div
              aria-label="コメントを読み込み中"
              className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500"
              role="status"
            />
          </div>
        )}

        {commentsQuery.data && (
          <div className="max-h-[40dvh] space-y-3 overflow-y-auto pr-1">
            {commentsQuery.data.map((comment) => (
              <CommentCard comment={comment} key={comment.id} />
            ))}
          </div>
        )}

        <form
          className="mt-4 border-t border-slate-100 pt-4"
          onSubmit={form.handleSubmit((values) => createComment.mutate(values))}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-600">投げ銭を添える <span className="font-medium text-slate-400">(任意)</span></p>
            {selectedTip > 0 && (
              <p className="text-xs font-bold text-rose-500">{selectedTip}円の応援</p>
            )}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {tipOptions.map((amount) => (
              <button
                aria-pressed={selectedTip === amount}
                className={`h-9 rounded-lg text-xs font-bold transition ${
                  selectedTip === amount
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600'
                }`}
                key={amount}
                onClick={() => form.setValue('tipAmount', amount)}
                type="button"
              >
                {amount === 0 ? 'なし' : `${amount}円`}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="min-w-0 flex-1">
              <input
                {...form.register('message')}
                aria-invalid={Boolean(form.formState.errors.message)}
                className="h-11 w-full rounded-xl bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-orange-300 aria-invalid:ring-2 aria-invalid:ring-red-300"
                placeholder="コメントを追加..."
              />
            </div>
            <button
              className="min-w-17 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50"
              disabled={createComment.isPending}
              type="submit"
            >
              {createComment.isPending ? '送信中' : '送信'}
            </button>
          </div>
          {form.formState.errors.message && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {form.formState.errors.message.message}
            </p>
          )}
          {createComment.isError && (
            <p className="mt-2 text-xs text-red-600" role="alert">
              コメントを送信できませんでした。
            </p>
          )}
        </form>
      </div>
    </FeedSheet>
  )
}
