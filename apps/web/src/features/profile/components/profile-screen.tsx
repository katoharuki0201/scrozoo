import { useState } from 'react'
import { Link } from 'react-router'
import { BottomNavigation } from '../../../shared/ui/bottom-navigation'
import {
  AccountCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../../shared/ui/icons'
import type { GalleryPost, Profile, ProfileViewMode } from '../model/profile'
import { GalleryPostDialog } from './gallery-post-dialog'
import { ProfileAvatar } from './profile-avatar'
import { ProfileGalleryGrid, ProfileVideoGrid } from './profile-media-grid'

type ProfileTab = 'videos' | 'supporter-gallery'

export function ProfileScreen({
  profile,
  viewMode,
  onSupport,
}: {
  profile: Profile
  viewMode: ProfileViewMode
  onSupport?: () => void
}) {
  const [tab, setTab] = useState<ProfileTab>('videos')
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null)
  const isCreator = profile.accountRole === 'creator'
  const isSupporterGallery = isCreator && tab === 'supporter-gallery'
  const showSupportButton = isCreator && viewMode === 'public' && profile.supportPrice !== null

  return (
    <main className="relative mx-auto h-dvh max-w-[430px] overflow-hidden bg-slate-50 shadow-2xl">
      <div className={`h-full overflow-y-auto ${showSupportButton ? 'pb-43' : 'pb-24'}`}>
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
              <p className="-rotate-2 text-3xl font-black tracking-[-0.08em] text-slate-800 italic">Scrozoo</p>
              <ProfileAvatar avatarUrl={profile.avatarUrl} name={profile.name} size="small" />
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

          {viewMode === 'self' && (
            <Link
              className="mt-7 flex h-17 items-center rounded-2xl bg-slate-200 px-5 text-slate-800 active:bg-slate-300"
              to="/mypage/account"
            >
              <AccountCircleIcon className="size-8" />
              <span className="ml-3 flex-1 text-base font-bold">アカウント情報</span>
              <ChevronRightIcon className="size-7" />
            </Link>
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
                <ProfileVideoGrid items={profile.videos} />
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
          className="absolute inset-x-6 bottom-22 z-30 h-14 rounded-2xl bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400 px-4 text-base font-bold text-white shadow-xl active:scale-[0.99]"
          onClick={onSupport}
          type="button"
        >
          応援プラン <span className="text-2xl">{profile.supportPrice}円</span> はこちら！
        </button>
      )}

      <BottomNavigation activePath={viewMode === 'self' ? '/mypage' : '/'} />

      {selectedPost && (
        <GalleryPostDialog onClose={() => setSelectedPost(null)} post={selectedPost} />
      )}
    </main>
  )
}
