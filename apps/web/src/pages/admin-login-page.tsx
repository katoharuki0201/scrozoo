import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { loginAdmin } from '../features/admin/api/admin-api'
import { useAdminAuth } from '../features/admin/hooks/use-admin-auth'
import { adminLoginFormSchema, type AdminLoginFormValues } from '../features/admin/model/admin'
import { BrandLogo } from '../shared/ui/brand-logo'

export function AdminLoginPage() {
  const { authenticate } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const form = useForm<AdminLoginFormValues>({ resolver: zodResolver(adminLoginFormSchema), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (session) => {
      authenticate(session)
      const from = typeof location.state === 'object' && location.state && 'from' in location.state && typeof location.state.from === 'string' ? location.state.from : '/admin'
      void navigate(from, { replace: true })
    },
  })

  return (
    <main className="grid min-h-screen grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)] bg-white">
      <section className="flex items-center justify-center px-12 py-16">
        <div className="w-full max-w-md">
          <div className="mb-12"><BrandLogo className="h-10 w-auto" /><p className="mt-2 text-[10px] font-bold tracking-[0.18em] text-slate-400">ADMIN CONSOLE</p></div>
          <h1 className="text-3xl font-bold tracking-tight">管理者ログイン</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">サービスの運営状況とアカウントを管理します。</p>
          <form className="mt-9 space-y-5" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div><label className="text-sm font-semibold text-slate-700" htmlFor="admin-email">メールアドレス</label><input {...form.register('email')} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-sky-600 focus:ring-3 focus:ring-sky-100" id="admin-email" placeholder="admin@scrozoo.jp" type="email" />{form.formState.errors.email && <p className="mt-1.5 text-sm text-red-600">{form.formState.errors.email.message}</p>}</div>
            <div><label className="text-sm font-semibold text-slate-700" htmlFor="admin-password">パスワード</label><input {...form.register('password')} className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none transition focus:border-sky-600 focus:ring-3 focus:ring-sky-100" id="admin-password" placeholder="8文字以上" type="password" />{form.formState.errors.password && <p className="mt-1.5 text-sm text-red-600">{form.formState.errors.password.message}</p>}</div>
            {mutation.isError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">メールアドレスまたはパスワードが正しくありません。</p>}
            <button className="h-12 w-full rounded-xl bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60" disabled={mutation.isPending} type="submit">{mutation.isPending ? 'ログイン中...' : '管理画面にログイン'}</button>
          </form>
          <p className="mt-8 text-xs leading-5 text-slate-400">このページはSCROZOO運営管理者専用です。</p>
        </div>
      </section>
      <section className="relative overflow-hidden bg-slate-950 p-16 text-white">
        <div className="absolute -right-28 -top-28 size-96 rounded-full bg-sky-500/20 blur-3xl" /><div className="absolute -bottom-36 left-0 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end"><p className="text-sm font-bold tracking-[0.25em] text-sky-400">MANAGE WITH CLARITY</p><h2 className="mt-5 max-w-xl text-5xl font-bold leading-tight tracking-tight">支援の広がりを、<br />ひとつの画面で。</h2><p className="mt-6 max-w-lg text-base leading-8 text-slate-300">ユーザー、Creator、収益の動きを把握し、動物園への継続的な支援を支えます。</p></div>
      </section>
    </main>
  )
}
