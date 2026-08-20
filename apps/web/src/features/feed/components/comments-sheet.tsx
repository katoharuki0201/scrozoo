import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ChevronLeftIcon, SuperChatIcon } from '../../../shared/ui/icons'
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

const tipOptions = [100, 300, 500] as const
type CommentGroup = 'regular' | 'supporter'

const tipStyles = {
  100: {
    card: 'border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50',
    amount: 'text-sky-600',
    selected: 'bg-sky-500 text-white shadow-md',
    idle: 'border border-sky-200 bg-white text-sky-600',
    submit: 'from-sky-400 to-cyan-500',
  },
  300: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
    amount: 'text-amber-600',
    selected: 'bg-amber-500 text-white shadow-md',
    idle: 'border border-amber-200 bg-white text-amber-600',
    submit: 'from-amber-400 to-orange-500',
  },
  500: {
    card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50',
    amount: 'text-rose-600',
    selected: 'bg-rose-500 text-white shadow-md',
    idle: 'border border-rose-200 bg-white text-rose-600',
    submit: 'from-orange-400 to-rose-500',
  },
} as const

function CommentCard({ comment }: { comment: FeedComment }) {
  const isSuperChat = comment.tipAmount > 0
  const tipStyle = isSuperChat
    ? tipStyles[comment.tipAmount as keyof typeof tipStyles]
    : undefined

  return (
    <article
      className={`flex gap-3 rounded-2xl border p-3 ${
        tipStyle
          ? tipStyle.card
          : comment.isSupporter
            ? 'border-amber-200 bg-amber-50'
            : 'border-slate-100 bg-slate-50'
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
        <p className="text-sm font-bold">{comment.author.name}</p>
        {isSuperChat && (
          <div className={`mt-2 flex items-center gap-1.5 ${tipStyle?.amount ?? 'text-rose-600'}`}>
            <SuperChatIcon className="size-4" />
            <span className="text-sm font-black">{comment.tipAmount}円の応援</span>
          </div>
        )}
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
  const [page, setPage] = useState<'list' | 'superchat-compose'>('list')
  const [commentGroup, setCommentGroup] = useState<CommentGroup>('regular')
  const form = useForm<CreateCommentValues>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { message: '', tipAmount: 0 },
  })
  const selectedTip = useWatch({ control: form.control, name: 'tipAmount' })
  const visibleComments = useMemo(
    () =>
      commentsQuery.data?.filter((comment) =>
        commentGroup === 'supporter' ? comment.isSupporter : !comment.isSupporter,
      ),
    [commentGroup, commentsQuery.data],
  )
  const regularCount = commentsQuery.data?.filter((comment) => !comment.isSupporter).length ?? 0
  const supporterCount = commentsQuery.data?.filter((comment) => comment.isSupporter).length ?? 0
  const createComment = useMutation({
    mutationFn: (values: CreateCommentValues) => createVideoComment(videoId, values),
    onSuccess: (comment) => {
      const zooId = queryClient
        .getQueryData<FeedVideo[]>(feedQueryOptions.queryKey)
        ?.find((video) => video.id === videoId)?.zoo.id

      queryClient.setQueryData<FeedComment[]>(
        videoCommentsQueryOptions(videoId).queryKey,
        (current) => [comment, ...(current ?? [])],
      )
      queryClient.setQueryData<FeedVideo[]>(
        feedQueryOptions.queryKey,
        (current) => current?.map((video) =>
          video.id === videoId
            ? { ...video, commentCount: video.commentCount + 1 }
            : video,
        ),
      )
      form.reset({ message: '', tipAmount: 0 })
      setCommentGroup(comment.isSupporter ? 'supporter' : 'regular')
      setPage('list')

      if (comment.tipAmount > 0) {
        if (zooId) queryClient.removeQueries({ queryKey: ['profile', 'zoo', zooId] })
        void queryClient.invalidateQueries({ queryKey: feedQueryOptions.queryKey })
      }
    },
  })

  function openSuperChatComposer() {
    createComment.reset()
    form.reset({ message: '', tipAmount: 100 })
    setPage('superchat-compose')
  }

  function returnToComments() {
    createComment.reset()
    form.reset({ message: '', tipAmount: 0 })
    setPage('list')
  }

  return (
    <FeedSheet
      onClose={onClose}
      title={page === 'superchat-compose' ? 'スパチャを送る' : `コメント ${commentCount}件`}
    >
      {page === 'superchat-compose' ? (
        <form
          className="mt-4"
          onSubmit={form.handleSubmit((values) => createComment.mutate(values))}
        >
          <button
            className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-slate-600"
            onClick={returnToComments}
            type="button"
          >
            <ChevronLeftIcon className="size-5" />
            コメントに戻る
          </button>
          <div className="mt-3 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 p-4">
            <div className="flex items-center gap-2 text-rose-600">
              <SuperChatIcon className="size-6" />
              <p className="text-sm font-black">応援金額を選択</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {tipOptions.map((amount) => (
                <button
                  aria-pressed={selectedTip === amount}
                  className={`h-12 rounded-xl text-sm font-black transition ${
                    selectedTip === amount
                      ? tipStyles[amount].selected
                      : tipStyles[amount].idle
                  }`}
                  key={amount}
                  onClick={() => form.setValue('tipAmount', amount)}
                  type="button"
                >
                  {amount}円
                </button>
              ))}
            </div>
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-600" htmlFor="superchat-message">
            応援コメント
          </label>
          <textarea
            {...form.register('message')}
            aria-invalid={Boolean(form.formState.errors.message)}
            className="mt-2 min-h-28 w-full resize-none rounded-2xl bg-slate-100 p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-rose-300 aria-invalid:ring-2 aria-invalid:ring-red-300"
            id="superchat-message"
            placeholder="動物園への応援メッセージを入力..."
          />
          {form.formState.errors.message && (
            <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.message.message}</p>
          )}
          {createComment.isError && (
            <p className="mt-2 text-xs text-red-600" role="alert">スパチャを送信できませんでした。</p>
          )}
          <button
            className={`mt-4 h-12 w-full rounded-xl bg-gradient-to-r text-sm font-black text-white shadow-md disabled:opacity-50 ${tipStyles[selectedTip as keyof typeof tipStyles]?.submit ?? tipStyles[100].submit}`}
            disabled={createComment.isPending}
            type="submit"
          >
            {createComment.isPending ? '送信中...' : `${selectedTip}円のスパチャを送る`}
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {([
              ['regular', `コメント ${regularCount}`],
              ['supporter', `サポーター ${supporterCount}`],
            ] as const).map(([group, label]) => (
              <button
                aria-pressed={commentGroup === group}
                className={`h-9 rounded-lg text-xs font-black transition ${commentGroup === group ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                key={group}
                onClick={() => setCommentGroup(group)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {commentsQuery.isPending && (
            <div className="grid h-28 place-items-center">
              <div aria-label="コメントを読み込み中" className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500" role="status" />
            </div>
          )}
          {commentsQuery.data && (
            <div className="mt-3 max-h-[40dvh] space-y-3 overflow-y-auto pr-1">
              {visibleComments?.map((comment) => <CommentCard comment={comment} key={comment.id} />)}
              {visibleComments?.length === 0 && (
                <div className="grid h-24 place-items-center rounded-2xl bg-slate-50 text-xs font-bold text-slate-400">
                  まだ投稿はありません
                </div>
              )}
            </div>
          )}

          <form
            className="mt-4 border-t border-slate-100 pt-4"
            onSubmit={form.handleSubmit((values) => createComment.mutate({ ...values, tipAmount: 0 }))}
          >
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  {...form.register('message')}
                  aria-invalid={Boolean(form.formState.errors.message)}
                  className="h-11 w-full rounded-xl bg-slate-100 py-2 pr-12 pl-4 text-sm outline-none focus:ring-2 focus:ring-orange-300 aria-invalid:ring-2 aria-invalid:ring-red-300"
                  placeholder="通常コメントを追加..."
                />
                <button
                  aria-label="スパチャを送る"
                  className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-sm"
                  onClick={openSuperChatComposer}
                  type="button"
                >
                  <SuperChatIcon className="size-5" />
                </button>
              </div>
              <button
                className="min-w-16 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white disabled:opacity-50"
                disabled={createComment.isPending}
                type="submit"
              >
                {createComment.isPending ? '送信中' : '送信'}
              </button>
            </div>
            {form.formState.errors.message && (
              <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.message.message}</p>
            )}
            {createComment.isError && (
              <p className="mt-2 text-xs text-red-600" role="alert">コメントを送信できませんでした。</p>
            )}
          </form>
        </div>
      )}
    </FeedSheet>
  )
}
