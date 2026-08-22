import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/hooks/use-auth'
import { BottomNavigation } from '../../../shared/ui/bottom-navigation'
import { BrandLogo } from '../../../shared/ui/brand-logo'
import {
  AccountCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  LogOutIcon,
  TargetIcon,
  XIcon,
} from '../../../shared/ui/icons'
import { SupportGoalProgress } from '../../support-goal/components/support-goal-progress'
import type { GalleryPost, Profile, ProfileViewMode } from '../model/profile'
import { GalleryPostDialog } from './gallery-post-dialog'
import { ProfileAvatar } from './profile-avatar'
import { ProfileGalleryGrid, ProfileVideoGrid } from './profile-media-grid'

type ProfileTab = 'videos' | 'supporter-gallery'

export function ProfileScreen({
  profile,
  viewMode,
  onSupport,
  hasActiveSupportPlan = false,
}: {
  profile: Profile
  viewMode: ProfileViewMode
  onSupport?: () => void
  hasActiveSupportPlan?: boolean
}) {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<ProfileTab>(
    searchParams.get('tab') === 'gallery' ? 'supporter-gallery' : 'videos',
  )
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const { logout } = useAuth()
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => setAccountMenuOpen(false),
  })
  const isCreator = profile.accountRole === 'creator'
  const isSupporterGallery = isCreator && tab === 'supporter-gallery'
  const showSupportButton = isCreator && viewMode === 'public' && profile.supportPrice !== null

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className={`h-full overflow-y-auto ${showSupportButton ? 'pb-43' : 'pb-24'}`}>
        {(searchParams.get('posted') === '1' || searchParams.get('videoPosted') === '1') && (
          <p className="absolute inset-x-6 top-5 z-30 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg" role="status">
            {searchParams.get('videoPosted') === '1'
              ? '動画を投稿しました。'
              : 'サポーターギャラリーに投稿しました。'}
          </p>
        )}
        <section className="relative px-6 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
          {viewMode === 'public' ? (
            <Link
              aria-label="ホームに戻る"
              className="absolute left-4 top-[max(1.5rem,env(safe-area-inset-top))] z-10 grid size-12 place-items-center rounded-full text-slate-800 active:bg-slate-200"
              to="/"
            >
              <ChevronLeftIcon className="size-9" />
            </Link>
          ) : (
            <div className="flex h-14 items-center justify-between">
              <BrandLogo className="h-8 w-auto" />
              <button aria-label="アカウントメニューを開く" className="rounded-full" onClick={() => setAccountMenuOpen(true)} type="button">
                <ProfileAvatar avatarUrl={profile.avatarUrl} name={profile.name} size="small" />
              </button>
            </div>
          )}

          <div className={`flex flex-col items-center ${viewMode === 'public' ? 'pt-17' : 'pt-3'}`}>
            <ProfileAvatar avatarUrl={profile.avatarUrl} name={profile.name} />
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-800">{profile.name}</h1>

            {isCreator && (
              <dl className="mt-7 grid w-full max-w-64 grid-cols-2 text-center">
                <div>
                  <dd className="text-2xl font-black text-slate-800">{profile.videoCount}</dd>
                  <dt className="mt-1 text-sm font-bold text-slate-400">動画数</dt>
                </div>
                <div>
                  <dd className="text-2xl font-black text-slate-800">{profile.supporterCount}</dd>
                  <dt className="mt-1 text-sm font-bold text-slate-400">サポーター数</dt>
                </div>
              </dl>
            )}
          </div>

          <p className="mt-7 whitespace-pre-line text-[15px] leading-7 text-slate-700">{profile.bio}</p>

          {isCreator && profile.supportGoal && (
            <div className="mt-6">
              <SupportGoalProgress goal={profile.supportGoal} />
            </div>
          )}

          {viewMode === 'self' && (
            <div className="mt-7 space-y-3">
              <Link
                className="flex h-17 items-center rounded-2xl bg-slate-200 px-5 text-slate-800 active:bg-slate-300"
                to="/mypage/account"
              >
                <AccountCircleIcon className="size-8" />
                <span className="ml-3 flex-1 text-base font-bold">アカウント情報</span>
                <ChevronRightIcon className="size-7" />
              </Link>
              {!isCreator && (
                <Link
                  className="flex h-17 items-center rounded-2xl bg-slate-200 px-5 text-slate-800 active:bg-slate-300"
                  to="/mypage/plans"
                >
                  <ClipboardListIcon className="size-8" />
                  <span className="ml-3 flex-1 text-base font-bold">加入中のプラン</span>
                  <ChevronRightIcon className="size-7" />
                </Link>
              )}
              {isCreator && (
                <Link
                  className="flex h-17 items-center rounded-2xl bg-slate-200 px-5 text-slate-800 active:bg-slate-300"
                  to="/mypage/support-goal"
                >
                  <TargetIcon className="size-8" />
                  <span className="ml-3 flex-1 text-base font-bold">応援目標の管理</span>
                  <ChevronRightIcon className="size-7" />
                </Link>
              )}
              <button
                className="flex h-17 w-full items-center rounded-2xl border border-red-100 bg-red-50 px-5 text-left text-red-600 active:bg-red-100"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
                type="button"
              >
                <LogOutIcon className="size-8" />
                <span className="ml-3 flex-1 text-base font-bold">{logoutMutation.isPending ? 'ログアウト中...' : 'ログアウト'}</span>
              </button>
            </div>
          )}
        </section>

        {isCreator ? (
          <div>
            <div aria-label="プロフィールの表示内容" className="flex gap-7 px-6" role="tablist">
              <button
                aria-selected={tab === 'videos'}
                className={`border-b-3 pb-2 text-lg font-black ${tab === 'videos' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500'}`}
                onClick={() => setTab('videos')}
                role="tab"
                type="button"
              >
                動画
              </button>
              <button
                aria-selected={tab === 'supporter-gallery'}
                className={`border-b-3 pb-2 text-lg font-black ${tab === 'supporter-gallery' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500'}`}
                onClick={() => setTab('supporter-gallery')}
                role="tab"
                type="button"
              >
                サポーターギャラリー
              </button>
            </div>
            <div className="mt-2">
              {isSupporterGallery ? (
                <ProfileGalleryGrid items={profile.galleryPosts} onSelect={setSelectedPost} />
              ) : (
                <ProfileVideoGrid items={profile.videos} creatorView={viewMode === 'self'} />
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="mx-6 inline-block border-b-3 border-slate-800 pb-2 text-xl font-black text-slate-800">
              ギャラリー
            </h2>
            <div className="mt-2">
              <ProfileGalleryGrid items={profile.galleryPosts} onSelect={setSelectedPost} />
            </div>
          </div>
        )}
      </div>

      {showSupportButton && (
        <button
          className={`absolute inset-x-6 bottom-22 z-30 h-14 rounded-2xl px-4 text-base font-bold text-white shadow-xl active:scale-[0.99] ${hasActiveSupportPlan ? 'bg-emerald-600' : 'bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400'}`}
          onClick={onSupport}
          type="button"
        >
          {hasActiveSupportPlan ? '応援プラン加入中' : <>応援プラン <span className="text-2xl">{profile.supportPrice}円</span> はこちら！</>}
        </button>
      )}

      <BottomNavigation activePath={viewMode === 'self' ? '/mypage' : '/'} />

      {selectedPost && (
        <GalleryPostDialog onClose={() => setSelectedPost(null)} post={selectedPost} />
      )}

      {accountMenuOpen && viewMode === 'self' && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/45" onClick={() => setAccountMenuOpen(false)} role="presentation">
          <section aria-label="アカウントメニュー" aria-modal="true" className="w-full rounded-t-3xl bg-white px-5 pt-3" onClick={(event) => event.stopPropagation()} role="dialog" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">アカウント</h2>
                <p className="mt-1 text-sm text-slate-500">{profile.name}</p>
              </div>
              <button aria-label="閉じる" className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700" onClick={() => setAccountMenuOpen(false)} type="button">
                <XIcon className="size-5" />
              </button>
            </div>
            <button className="mt-6 flex h-13 w-full items-center rounded-2xl bg-red-50 px-4 text-left font-bold text-red-600 disabled:opacity-50" disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()} type="button">
              <LogOutIcon className="size-6" />
              <span className="ml-3">{logoutMutation.isPending ? 'ログアウト中...' : 'ログアウト'}</span>
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
