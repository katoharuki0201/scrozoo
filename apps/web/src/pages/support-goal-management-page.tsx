import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useAuth } from '../features/auth/hooks/use-auth'
import {
  deleteMySupportGoal,
  mySupportGoalQueryOptions,
  saveMySupportGoal,
} from '../features/support-goal/api/support-goal-api'
import { SupportGoalProgress } from '../features/support-goal/components/support-goal-progress'
import {
  supportGoalFormSchema,
  type SupportGoalFormValues,
} from '../features/support-goal/model/support-goal'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { ChevronLeftIcon, XIcon } from '../shared/ui/icons'

const fieldClassName = 'mt-2 w-full rounded-2xl border border-transparent bg-slate-200 px-4 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white aria-invalid:border-red-400'

function defaultDeadline() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

export function SupportGoalManagementPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const goalQuery = useQuery({
    ...mySupportGoalQueryOptions,
    enabled: user?.role === 'creator',
  })
  const form = useForm<SupportGoalFormValues>({
    resolver: zodResolver(supportGoalFormSchema),
    defaultValues: {
      title: '',
      targetAmount: 100_000,
      deadline: defaultDeadline(),
    },
  })
  const saveMutation = useMutation({
    mutationFn: saveMySupportGoal,
    onSuccess: (goal) => {
      queryClient.setQueryData(mySupportGoalQueryOptions.queryKey, goal)
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      form.reset({
        title: goal.title,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline,
      })
      setSaved(true)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteMySupportGoal,
    onSuccess: () => {
      queryClient.setQueryData(mySupportGoalQueryOptions.queryKey, null)
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      form.reset({ title: '', targetAmount: 100_000, deadline: defaultDeadline() })
      setDeleteOpen(false)
      setSaved(false)
    },
  })

  useEffect(() => {
    if (!goalQuery.data) return

    form.reset({
      title: goalQuery.data.title,
      targetAmount: goalQuery.data.targetAmount,
      deadline: goalQuery.data.deadline,
    })
  }, [form, goalQuery.data])

  useEffect(() => {
    if (!saved) return

    const timeoutId = window.setTimeout(() => setSaved(false), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [saved])

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
      <div className="h-full overflow-y-auto px-5 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex min-h-14 items-center">
          <Link aria-label="マイページに戻る" className="grid size-12 shrink-0 place-items-center rounded-full text-slate-800 active:bg-slate-200" to="/mypage">
            <ChevronLeftIcon className="size-9" />
          </Link>
          <h1 className="ml-2 text-xl font-black text-slate-800">応援目標の管理</h1>
        </header>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          ユーザーに表示する応援目標は、1つまで設定できます。現在金額はプラン加入とスパチャから自動集計されます。
        </p>

        {goalQuery.isPending && (
          <div className="grid min-h-56 place-items-center">
            <div aria-label="応援目標を読み込み中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
          </div>
        )}

        {goalQuery.isError && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-center">
            <p className="text-sm font-bold text-red-700">応援目標を読み込めませんでした。</p>
            <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => void goalQuery.refetch()} type="button">もう一度試す</button>
          </div>
        )}

        {!goalQuery.isPending && !goalQuery.isError && (
          <>
            {goalQuery.data && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-black text-slate-500">現在の表示</p>
                <SupportGoalProgress goal={goalQuery.data} />
              </div>
            )}

            <form className="mt-7 space-y-5" noValidate onChange={() => setSaved(false)} onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
              <div>
                <label className="text-sm font-black text-slate-700" htmlFor="goal-title">目標タイトル</label>
                <input {...form.register('title')} aria-invalid={Boolean(form.formState.errors.title)} className={`${fieldClassName} h-14`} id="goal-title" placeholder="例：トラ舎に新しい日よけを設置したい" />
                {form.formState.errors.title && <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.title.message}</p>}
              </div>

              <div>
                <label className="text-sm font-black text-slate-700" htmlFor="goal-amount">目標金額</label>
                <div className="relative">
                  <input {...form.register('targetAmount', { valueAsNumber: true })} aria-invalid={Boolean(form.formState.errors.targetAmount)} className={`${fieldClassName} h-14 pr-12`} id="goal-amount" inputMode="numeric" min="500" step="500" type="number" />
                  <span className="pointer-events-none absolute right-4 bottom-4 text-sm font-bold text-slate-500">円</span>
                </div>
                {form.formState.errors.targetAmount && <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.targetAmount.message}</p>}
              </div>

              <div>
                <label className="text-sm font-black text-slate-700" htmlFor="goal-deadline">期限</label>
                <input {...form.register('deadline')} aria-invalid={Boolean(form.formState.errors.deadline)} className={`${fieldClassName} h-14`} id="goal-deadline" type="date" />
                {form.formState.errors.deadline && <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.deadline.message}</p>}
              </div>

              <button className="h-14 w-full rounded-2xl bg-slate-950 text-base font-black text-white disabled:opacity-50" disabled={saveMutation.isPending || !form.formState.isDirty} type="submit">
                {saveMutation.isPending ? '保存中...' : goalQuery.data ? '目標を更新する' : '目標を設定する'}
              </button>

              {saved && <p className="text-center text-sm font-bold text-emerald-600" role="status">応援目標を保存しました。</p>}
              {saveMutation.isError && <p className="text-center text-sm font-bold text-red-600" role="alert">応援目標を保存できませんでした。</p>}
            </form>

            {goalQuery.data && (
              <button className="mt-5 h-12 w-full rounded-2xl border border-red-200 text-sm font-bold text-red-600" onClick={() => setDeleteOpen(true)} type="button">応援目標を削除する</button>
            )}
          </>
        )}
      </div>

      <BottomNavigation activePath="/mypage" />

      {deleteOpen && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/45" role="presentation" onClick={() => setDeleteOpen(false)}>
          <section aria-label="応援目標の削除確認" aria-modal="true" className="w-full rounded-t-3xl bg-white px-5 pt-3" onClick={(event) => event.stopPropagation()} role="dialog" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-lg font-black">応援目標を削除しますか？</h2>
              <button aria-label="閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100" onClick={() => setDeleteOpen(false)} type="button"><XIcon className="size-5" /></button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">ホームとプロフィールから、現在の応援目標が表示されなくなります。</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-700" onClick={() => setDeleteOpen(false)} type="button">キャンセル</button>
              <button className="h-12 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-50" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} type="button">{deleteMutation.isPending ? '削除中...' : '削除する'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
