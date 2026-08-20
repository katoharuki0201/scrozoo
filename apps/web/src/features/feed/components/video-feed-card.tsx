import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { FeedVideo } from '../model/feed'
import { FeedAction } from './feed-action'
import { HeartIcon, MessageIcon, PlayIcon, VolumeIcon } from '../../../shared/ui/icons'

const FREE_PREVIEW_SECONDS = 5

type VideoFeedCardProps = {
  active: boolean
  isFreeUser: boolean
  item: FeedVideo
  onLike: () => void
  onOpenComments: () => void
  onSupport: () => void
}

export function VideoFeedCard({
  active,
  isFreeUser,
  item,
  onLike,
  onOpenComments,
  onSupport,
}: VideoFeedCardProps) {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const video = videoRef.current

    if (!video) return

    if (active) {
      void video.play().catch(() => setIsPaused(true))
    } else {
      video.pause()
    }
  }, [active])

  function handleTimeUpdate() {
    const video = videoRef.current

    if (!video || !isFreeUser || video.currentTime < FREE_PREVIEW_SECONDS) {
      return
    }

    video.currentTime = 0
  }

  function togglePlayback() {
    const video = videoRef.current

    if (!video) return

    if (video.paused) {
      void video.play()
      setIsPaused(false)
    } else {
      video.pause()
      setIsPaused(true)
    }
  }

  return (
    <article className="relative h-full w-full snap-start overflow-hidden bg-slate-950 text-white">
      <video
        className="absolute inset-0 size-full object-cover"
        loop={!isFreeUser}
        muted={isMuted}
        onClick={togglePlayback}
        onPause={() => setIsPaused(true)}
        onPlay={() => setIsPaused(false)}
        onTimeUpdate={handleTimeUpdate}
        playsInline
        preload={active ? 'auto' : 'metadata'}
        ref={videoRef}
        src={item.videoUrl}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent via-45% to-black/85" />

      {isPaused && (
        <button
          aria-label="動画を再生"
          className="absolute top-1/2 left-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
          onClick={togglePlayback}
          type="button"
        >
          <PlayIcon className="ml-1 size-8" />
        </button>
      )}

      <button
        aria-label={isMuted ? '音声をオンにする' : '音声をオフにする'}
        className="absolute top-24 right-4 z-10 grid size-9 place-items-center rounded-full bg-black/30 backdrop-blur-sm"
        onClick={() => setIsMuted((current) => !current)}
        type="button"
      >
        <VolumeIcon className="size-5" muted={isMuted} />
      </button>

      <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col items-center gap-3">
        <button
          aria-label={`${item.zoo.name}のプロフィール`}
          className="size-13 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg"
          onClick={() => void navigate(`/zoos/${item.zoo.id}`)}
          type="button"
        >
          <img
            alt=""
            className="size-full object-cover"
            src={item.zoo.avatarUrl}
          />
        </button>
        <FeedAction count={item.likeCount} label="いいね" onClick={onLike}>
          <HeartIcon className={`size-8 ${item.isLiked ? 'text-rose-500' : ''}`} fill={item.isLiked ? 'currentColor' : 'none'} />
        </FeedAction>
        <FeedAction count={item.commentCount} label="コメント" onClick={onOpenComments}>
          <MessageIcon className="size-8" />
        </FeedAction>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-21 z-10 px-4 pr-19">
        <button
          className="pointer-events-auto text-left text-base font-bold drop-shadow-md"
          onClick={() => void navigate(`/zoos/${item.zoo.id}`)}
          type="button"
        >
          {item.zoo.name}
        </button>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/95 drop-shadow-md">{item.caption}</p>
        <p className="mt-1 line-clamp-1 text-sm font-bold text-sky-300">
          {item.tags.map((tag) => `#${tag}`).join('  ')}
        </p>
        <button
          className="pointer-events-auto mt-3 h-11 w-[calc(100vw-2rem)] max-w-[398px] rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400 px-4 text-sm font-bold text-white shadow-lg active:scale-[0.99]"
          onClick={onSupport}
          type="button"
        >
          応援プラン <span className="text-xl">{item.supportPrice}円</span> はこちら！
        </button>
      </div>
    </article>
  )
}
