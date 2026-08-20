import { XIcon } from '../../../shared/ui/icons'
import type { GalleryPost } from '../model/profile'

export function GalleryPostDialog({
  post,
  onClose,
}: {
  post: GalleryPost
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-label="ギャラリー投稿詳細"
        aria-modal="true"
        className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="relative bg-slate-950">
          <img alt={post.caption} className="max-h-[58dvh] w-full object-contain" src={post.imageUrl} />
          <button
            aria-label="閉じる"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm"
            onClick={onClose}
            type="button"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm leading-6 text-slate-800">{post.caption}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">
            {post.author.name} ・ {post.zoo.name}
          </p>
        </div>
      </section>
    </div>
  )
}
