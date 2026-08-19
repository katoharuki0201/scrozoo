import { NavLink } from 'react-router'
import { HeartIcon, HomeIcon, QrCodeIcon, UserIcon } from './icons'

const items = [
  { to: '/', label: 'ホーム', icon: HomeIcon },
  { to: '/scan', label: 'QR読み込み', icon: QrCodeIcon },
  { to: '/favorites', label: 'お気に入り', icon: HeartIcon },
  { to: '/mypage', label: 'マイページ', icon: UserIcon },
]

export function BottomNavigation() {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="absolute inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/96 px-2 pt-2 backdrop-blur-xl"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold transition ${
                isActive ? 'text-orange-500' : 'text-slate-500 active:bg-slate-100'
              }`
            }
            end={to === '/'}
            key={to}
            to={to}
          >
            <Icon className="size-7" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
