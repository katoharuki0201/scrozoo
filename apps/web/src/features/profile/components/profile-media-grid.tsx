import { Link } from 'react-router'
import { PlayIcon } from '../../../shared/ui/icons'
import type { GalleryPost, ProfileVideo } from '../model/profile'

function formatViewCount(count: number) {
  return count >= 10_000 ? `${Math.floor(count / 1_000) / 10}万` : count.toLocaleString('ja-JP')
}

export function ProfileVideoGrid({ items }: { items: ProfileVideo[] }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item) => (
        <Link
          aria-label={`${item.title}、${formatViewCount(item.viewCount)}回再生`}
          className="relative aspect-[3/4] min-w-0 overflow-hidden bg-slate-200"
          key={item.id}
          to={`/?video=${encodeURIComponent(item.videoId)}`}
        >
          <video
            aria-hidden="true"
            className="size-full object-cover"
            muted
            playsInline
            preload="metadata"
            src={`${item.videoUrl}#t=${item.thumbnailTime}`}
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md">
            <PlayIcon className="size-4" />
            {formatViewCount(item.viewCount)}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function ProfileGalleryGrid({
  items,
  onSelect,
}: {
  items: GalleryPost[]
  onSelect: (item: GalleryPost) => void
}) {
  if (items.length === 0) {
    return (
      <p className="px-7 py-12 text-center text-sm leading-6 text-slate-500">
        まだギャラリーへの写真投稿はありません。
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item) => (
        <button
          aria-label={`${item.caption}の写真を見る`}
          className="aspect-square min-w-0 overflow-hidden bg-slate-200 active:opacity-80"
          key={item.id}
          onClick={() => onSelect(item)}
          type="button"
        >
          <img alt="" className="size-full object-cover" src={item.imageUrl} />
        </button>
      ))}
    </div>
  )
}
