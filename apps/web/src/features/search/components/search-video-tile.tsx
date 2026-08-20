import { Link } from 'react-router'
import type { SearchVideo } from '../model/search'
import { PlayIcon } from '../../../shared/ui/icons'

function formatViewCount(count: number) {
  if (count >= 10_000) {
    return `${Math.floor(count / 1_000) / 10}万`
  }

  return count.toLocaleString('ja-JP')
}

export function SearchVideoTile({ video }: { video: SearchVideo }) {
  return (
    <Link
      aria-label={`${video.title}、${formatViewCount(video.viewCount)}回再生`}
      className="group relative aspect-[3/4] min-w-0 overflow-hidden bg-slate-200"
      to={`/?video=${encodeURIComponent(video.id)}`}
    >
      <video
        aria-hidden="true"
        className="size-full object-cover transition duration-300 group-active:scale-105"
        muted
        playsInline
        preload="metadata"
        src={`${video.videoUrl}#t=${video.thumbnailTime}`}
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md">
        <PlayIcon className="size-4" />
        {formatViewCount(video.viewCount)}
      </span>
    </Link>
  )
}
