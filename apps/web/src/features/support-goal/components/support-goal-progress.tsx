import type { SupportGoal } from '../model/support-goal'

const currencyFormatter = new Intl.NumberFormat('ja-JP')
const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
})

export function SupportGoalProgress({
  goal,
  variant = 'light',
}: {
  goal: SupportGoal
  variant?: 'light' | 'overlay'
}) {
  const percentage = Math.min(
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
    100,
  )
  const achieved = goal.status === 'achieved'
  const expired = goal.status === 'expired'
  const overlay = variant === 'overlay'
  const statusLabel = achieved ? '目標達成' : expired ? '受付終了' : `${percentage}%`

  return (
    <section
      aria-label="応援目標"
      className={`rounded-2xl border p-3.5 ${
        overlay
          ? 'border-white/20 bg-black/35 text-white backdrop-blur-md'
          : 'border-emerald-100 bg-white text-slate-800 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] font-black tracking-wider ${overlay ? 'text-emerald-300' : 'text-emerald-600'}`}>
          応援目標
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${achieved ? 'bg-emerald-500 text-white' : expired ? 'bg-slate-500 text-white' : overlay ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
          {statusLabel}
        </span>
      </div>
      <h2 className="mt-1.5 line-clamp-1 text-sm font-black">{goal.title}</h2>
      <div
        aria-label={`目標達成率 ${percentage}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className={`mt-2 h-2 overflow-hidden rounded-full ${overlay ? 'bg-white/20' : 'bg-slate-100'}`}
        role="progressbar"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${achieved ? 'bg-emerald-400' : 'bg-gradient-to-r from-orange-400 via-rose-500 to-sky-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`mt-2 flex items-center justify-between gap-3 text-[11px] font-bold ${overlay ? 'text-white/85' : 'text-slate-500'}`}>
        <span>
          <strong className={overlay ? 'text-white' : 'text-slate-800'}>{currencyFormatter.format(goal.currentAmount)}円</strong>
          {' / '}{currencyFormatter.format(goal.targetAmount)}円
        </span>
        <span>{dateFormatter.format(new Date(`${goal.deadline}T00:00:00`))}まで</span>
      </div>
    </section>
  )
}
