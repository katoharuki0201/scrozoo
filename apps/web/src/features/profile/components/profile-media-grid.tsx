import { VideoGridTile } from '../../../shared/ui/video-grid-tile'
import type { GalleryPost, ProfileVideo } from '../model/profile'

export function ProfileVideoGrid({ items }: { items: ProfileVideo[] }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item) => (
        <VideoGridTile
          item={{ ...item, id: item.videoId }}
          key={item.id}
        />
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
          aria-label="ギャラリーの写真を見る"
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
