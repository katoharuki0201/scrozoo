import { Link } from 'react-router'
import { PlayIcon } from './icons'

export type VideoGridItem = {
  id: string
  videoUrl: string
  title: string
  viewCount: number
  thumbnailTime: number
}

function formatVideoViewCount(count: number) {
  return count >= 10_000
    ? `${Math.floor(count / 1_000) / 10}万`
    : count.toLocaleString('ja-JP')
}

export function VideoGridTile({ item }: { item: VideoGridItem }) {
  return (
    <Link
      aria-label={`${item.title}、${formatVideoViewCount(item.viewCount)}回再生`}
      className="group relative aspect-[3/4] min-w-0 overflow-hidden bg-slate-200"
      to={`/?video=${encodeURIComponent(item.id)}`}
    >
      <video
        aria-hidden="true"
        className="size-full object-cover transition duration-300 group-active:scale-105"
        muted
        playsInline
        preload="metadata"
        src={`${item.videoUrl}#t=${item.thumbnailTime}`}
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md">
        <PlayIcon className="size-4" />
        {formatVideoViewCount(item.viewCount)}
      </span>
    </Link>
  )
}
