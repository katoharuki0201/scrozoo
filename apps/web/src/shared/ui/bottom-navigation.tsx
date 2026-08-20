import { NavLink } from 'react-router'
import { useAuth } from '../../features/auth/hooks/use-auth'
import { HeartIcon, HomeIcon, QrCodeIcon, UploadIcon, UserIcon, UsersIcon } from './icons'

const viewerItems = [
  { to: '/', label: 'ホーム', icon: HomeIcon },
  { to: '/scan', label: 'QR読み込み', icon: QrCodeIcon },
  { to: '/favorites', label: 'お気に入り', icon: HeartIcon },
  { to: '/mypage', label: 'マイページ', icon: UserIcon },
]

const creatorItems = [
  { to: '/mypage', label: 'マイページ', icon: UserIcon },
  { to: '/mypage/posts/new', label: '投稿作成', icon: UploadIcon },
  { to: '/mypage/supporters', label: 'サポーター', icon: UsersIcon },
]

export function BottomNavigation({ activePath }: { activePath?: string }) {
  const { user } = useAuth()
  const items = user?.role === 'creator' ? creatorItems : viewerItems

  return (
    <nav
      aria-label="メインナビゲーション"
      className="absolute inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/96 px-2 pt-2 backdrop-blur-xl"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold transition ${
                isActive || activePath === to
                  ? 'text-orange-500'
                  : 'text-slate-500 active:bg-slate-100'
              }`
            }
            end={to === '/' || to === '/mypage'}
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
