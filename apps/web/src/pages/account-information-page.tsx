import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import {
  accountInformationQueryOptions,
  updateAccountInformation,
} from '../features/account/api/account-information-api'
import {
  accountInformationFormSchema,
  type AccountInformation,
  type AccountInformationFormValues,
} from '../features/account/model/account-information'
import type { User } from '../features/auth/model/auth'
import type { Profile } from '../features/profile/model/profile'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { ChevronLeftIcon } from '../shared/ui/icons'

const fieldClassName = 'mt-3 w-full rounded-2xl border border-transparent bg-slate-200 px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:bg-white'

export function AccountInformationPage() {
  const accountQuery = useQuery(accountInformationQueryOptions)

  if (accountQuery.isPending) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 shadow-2xl">
        <div aria-label="ユーザー情報を読み込み中" className="size-8 animate-spin rounded-full border-3 border-slate-200 border-t-slate-700" role="status" />
      </main>
    )
  }

  if (accountQuery.isError) {
    return (
      <main className="mx-auto grid h-dvh max-w-[430px] place-items-center bg-slate-50 px-8 text-center shadow-2xl">
        <div>
          <p className="font-bold text-slate-800">ユーザー情報を読み込めませんでした</p>
          <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => void accountQuery.refetch()} type="button">
            もう一度試す
          </button>
        </div>
      </main>
    )
  }

  return <AccountInformationForm initialValues={accountQuery.data} />
}

function AccountInformationForm({ initialValues }: { initialValues: AccountInformation }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const form = useForm<AccountInformationFormValues>({
    resolver: zodResolver(accountInformationFormSchema),
    defaultValues: initialValues,
  })
  const bio = useWatch({ control: form.control, name: 'bio' })
  const updateMutation = useMutation({
    mutationFn: updateAccountInformation,
    onSuccess: (account) => {
      queryClient.setQueryData(accountInformationQueryOptions.queryKey, account)
      queryClient.setQueryData<User | null>(['auth', 'session'], (user) =>
        user ? { ...user, name: account.name, email: account.email } : user,
      )
      queryClient.setQueryData<Profile>(['profile', 'me'], (profile) =>
        profile ? { ...profile, name: account.name, bio: account.bio } : profile,
      )
      form.reset(account)
      setSaved(true)
    },
  })

  useEffect(() => {
    if (!saved) return

    const timeoutId = window.setTimeout(() => setSaved(false), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [saved])

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="h-full overflow-y-auto px-6 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex h-14 items-center">
          <Link aria-label="マイページに戻る" className="grid size-12 place-items-center rounded-full text-slate-800 active:bg-slate-200" to="/mypage">
            <ChevronLeftIcon className="size-9" />
          </Link>
          <h1 className="sr-only">ユーザー情報</h1>
        </header>

        <form
          className="mt-7 space-y-6"
          noValidate
          onChange={() => setSaved(false)}
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <div>
            <label className="text-xl font-black text-slate-800" htmlFor="account-name">ユーザー名</label>
            <input
              {...form.register('name')}
              aria-invalid={Boolean(form.formState.errors.name)}
              autoComplete="name"
              className={`${fieldClassName} h-14`}
              id="account-name"
            />
            {form.formState.errors.name && <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <label className="text-xl font-black text-slate-800" htmlFor="account-email">メールアドレス</label>
            <input
              value={initialValues.email}
              autoComplete="email"
              className={`${fieldClassName} h-14`}
              id="account-email"
              inputMode="email"
              type="email"
              readOnly
            />
            <p className="mt-2 text-xs text-slate-500">メールアドレスは変更できません。</p>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <label className="text-xl font-black text-slate-800" htmlFor="account-bio">自己紹介</label>
              <span className="text-xs text-slate-400">{bio.length} / 200</span>
            </div>
            <textarea
              {...form.register('bio')}
              aria-invalid={Boolean(form.formState.errors.bio)}
              className={`${fieldClassName} min-h-36 resize-none py-4 leading-6`}
              id="account-bio"
            />
            {form.formState.errors.bio && <p className="mt-2 text-xs text-red-600" role="alert">{form.formState.errors.bio.message}</p>}
          </div>

          <button
            className="h-14 w-full rounded-2xl bg-slate-950 text-base font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 active:scale-[0.99]"
            disabled={updateMutation.isPending || !form.formState.isDirty}
            type="submit"
          >
            {updateMutation.isPending ? '保存中...' : '保存する'}
          </button>

          {saved && <p className="text-center text-sm font-bold text-emerald-600" role="status">ユーザー情報を保存しました。</p>}
          {updateMutation.isError && <p className="text-center text-sm font-bold text-red-600" role="alert">保存できませんでした。もう一度お試しください。</p>}
        </form>
      </div>

      <BottomNavigation activePath="/mypage" />
    </main>
  )
}
