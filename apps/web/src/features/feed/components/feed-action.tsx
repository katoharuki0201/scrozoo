import type { ReactNode } from 'react'

type FeedActionProps = {
  label: string
  count?: number
  children: ReactNode
  onClick: () => void
}

export function FeedAction({ label, count, children, onClick }: FeedActionProps) {
  return (
    <button
      aria-label={label}
      className="flex min-h-13 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl text-white drop-shadow-md active:scale-95"
      onClick={onClick}
      type="button"
    >
      {children}
      {count !== undefined && <span className="text-xs font-bold tabular-nums">{count}</span>}
    </button>
  )
}
