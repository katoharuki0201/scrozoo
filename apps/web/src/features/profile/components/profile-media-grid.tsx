import { Link } from 'react-router'
import { LockIcon, PlayIcon } from '../../../shared/ui/icons'
import type { ProfileMedia } from '../model/profile'

function formatViewCount(count: number) {
  return count >= 10_000 ? `${Math.floor(count / 1_000) / 10}万` : count.toLocaleString('ja-JP')
}

export function ProfileMediaGrid({
  items,
  locked = false,
}: {
  items: ProfileMedia[]
  locked?: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item) => {
        const content = (
          <>
            <video
              aria-hidden="true"
              className={`size-full object-cover ${locked ? 'scale-105 blur-[2px]' : ''}`}
              muted
              playsInline
              preload="metadata"
              src={`${item.videoUrl}#t=${item.thumbnailTime}`}
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
            {locked ? (
              <span className="absolute inset-0 grid place-items-center bg-slate-950/25 text-white">
                <span className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
                  <LockIcon className="size-5" />
                </span>
              </span>
            ) : (
              <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md">
                <PlayIcon className="size-4" />
                {formatViewCount(item.viewCount)}
              </span>
            )}
          </>
        )

        return locked ? (
          <div className="relative aspect-[3/4] min-w-0 overflow-hidden bg-slate-200" key={item.id}>
            {content}
          </div>
        ) : (
          <Link
            aria-label={`${item.title}、${formatViewCount(item.viewCount)}回再生`}
            className="relative aspect-[3/4] min-w-0 overflow-hidden bg-slate-200"
            key={item.id}
            to={`/?video=${encodeURIComponent(item.videoId)}`}
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}
