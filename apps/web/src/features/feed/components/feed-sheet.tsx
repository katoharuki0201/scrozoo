import type { ReactNode } from 'react'
import { XIcon } from '../../../shared/ui/icons'

type FeedSheetProps = {
  children: ReactNode
  onClose: () => void
  title: string
}

export function FeedSheet({ children, onClose, title }: FeedSheetProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/45" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 text-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100" onClick={onClose} type="button">
            <XIcon className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
