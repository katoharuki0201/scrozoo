import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { loginWithEmail, loginWithGoogle } from '../features/auth/api/auth-api'
import { useAuth } from '../features/auth/hooks/use-auth'
import {
  loginFormSchema,
  type AuthSession,
  type LoginFormValues,
} from '../features/auth/model/auth'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.74 2.98-4.32 2.98-7.4" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22" fill="#34A853" />
      <path d="M6.39 13.88A6 6 0 0 1 6.07 12c0-.65.11-1.29.32-1.88V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49z" fill="#FBBC05" />
      <path d="M12 5.99c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.61C7.18 7.75 9.39 5.99 12 5.99" fill="#EA4335" />
    </svg>
  )
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.22A10.48 10.48 0 0 0 1.93 12C3.32 16.06 7.17 19 12 19c.94 0 1.84-.11 2.7-.32M6.23 6.23A10.45 10.45 0 0 1 12 5c4.83 0 8.68 2.94 10.07 7a10.52 10.52 0 0 1-2.3 4.04M6.23 6.23 3 3m3.23 3.23 3.14 3.14m10.4 6.67L21 21m-1.23-4.96-3.14-3.14m0 0a4.5 4.5 0 0 0-5.53-5.53m5.53 5.53-5.53-5.53m0 0L7.96 4.23m3.14 3.14L7.96 4.23" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.04 12.32a1 1 0 0 1 0-.64C3.42 7.51 7.35 4.5 12 4.5s8.58 3.01 9.96 7.18a1 1 0 0 1 0 .64C20.58 16.49 16.65 19.5 12 19.5s-8.58-3.01-9.96-7.18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
    </svg>
  )
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { authenticate } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const from =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string' &&
    location.state.from.startsWith('/')
      ? location.state.from
      : '/'

  function completeLogin(session: AuthSession) {
    authenticate(session)
    void navigate(session.user.role === 'creator' && from === '/' ? '/mypage' : from, { replace: true })
  }

  const emailLogin = useMutation({
    mutationFn: loginWithEmail,
    onSuccess: completeLogin,
  })
  const googleLogin = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: completeLogin,
  })
  const isSubmitting = emailLogin.isPending || googleLogin.isPending
  const hasLoginError = emailLogin.isError || googleLogin.isError

  return (
    <main className="mx-auto min-h-svh max-w-[430px] bg-white shadow-2xl">
      <section className="flex min-h-svh items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-950 font-bold text-white">S</div>
            <span className="text-xl font-bold tracking-tight">Scrozoo</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950">ログイン</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              アカウント情報を入力して続行してください。
            </p>
          </div>

          <button
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => googleLogin.mutate()}
            type="button"
          >
            <GoogleIcon />
            Googleでログイン
          </button>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">または</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form
            className="space-y-5"
            noValidate
            onSubmit={form.handleSubmit((values) => emailLogin.mutate(values))}
          >
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                メールアドレス
              </label>
              <input
                {...form.register('email')}
                aria-invalid={Boolean(form.formState.errors.email)}
                autoComplete="email"
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-500 aria-invalid:ring-red-100"
                id="email"
                placeholder="name@example.com"
                type="email"
              />
              {form.formState.errors.email && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                パスワード
              </label>
              <div className="relative mt-2">
                <input
                  {...form.register('password')}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-500 aria-invalid:ring-red-100"
                  id="password"
                  placeholder="8文字以上"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  <EyeIcon hidden={!showPassword} />
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {hasLoginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                ログインできませんでした。時間をおいてもう一度お試しください。
              </div>
            )}

            <button
              className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {emailLogin.isPending ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            アカウントをお持ちでない方は
            {' '}
            <Link className="font-bold text-sky-700 hover:text-sky-800" state={location.state} to="/register">
              新規登録
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            続行することで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </p>
        </div>
      </section>
    </main>
  )
}
