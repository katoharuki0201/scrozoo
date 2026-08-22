import { Link } from 'react-router'
import { BottomNavigation } from '../shared/ui/bottom-navigation'
import { BrandLogo } from '../shared/ui/brand-logo'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className="relative grid h-full place-items-center px-8 pb-20 text-center">
        <div>
          <BrandLogo className="mx-auto h-9 w-auto" />
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">このページは次の実装で追加します。</p>
          <Link className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white" to="/">ホームへ戻る</Link>
        </div>
        <BottomNavigation />
      </div>
    </main>
  )
}
