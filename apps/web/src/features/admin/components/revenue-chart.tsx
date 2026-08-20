import type { AdminRevenue } from '../model/admin'
import { formatCurrency } from '../lib/format'

export function RevenueChart({ months }: { months: AdminRevenue['months'] }) {
  const max = Math.max(...months.map((month) => month.gross), 1)
  const width = 760
  const height = 230
  const padding = 28
  const points = months.map((month, index) => ({
    x: padding + index * ((width - padding * 2) / Math.max(months.length - 1, 1)),
    y: height - padding - (month.gross / max) * (height - padding * 2),
  }))
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const area = `${path} L ${points.at(-1)?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <div>
      <div className="overflow-x-auto">
        <svg aria-label="月別総支援額の推移" className="min-w-[700px]" role="img" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line key={ratio} stroke="#e2e8f0" strokeDasharray="4 5" x1={padding} x2={width - padding} y1={height - padding - ratio * (height - padding * 2)} y2={height - padding - ratio * (height - padding * 2)} />
          ))}
          <path d={area} fill="url(#revenue-fill)" />
          <path d={path} fill="none" stroke="#0284c7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {points.map((point, index) => (
            <g key={months[index].month}>
              <circle cx={point.x} cy={point.y} fill="white" r="4" stroke="#0284c7" strokeWidth="3" />
              <text fill="#64748b" fontSize="11" textAnchor="middle" x={point.x} y={height - 7}>{Number(months[index].month.slice(5))}月</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex justify-end gap-5 text-xs text-slate-500">
        <span>最高月 {formatCurrency(max)}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-600" />総支援額</span>
      </div>
    </div>
  )
}
