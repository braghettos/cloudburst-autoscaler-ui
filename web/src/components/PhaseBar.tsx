import { Link } from 'react-router-dom'

const phaseOrder = ['Pending', 'Provisioning', 'Joining', 'Ready', 'Failed', 'Deleting'] as const
const phaseColors: Record<string, string> = {
  Pending: 'bg-amber-500',
  Provisioning: 'bg-blue-500',
  Joining: 'bg-violet-500',
  Ready: 'bg-green-500',
  Failed: 'bg-red-500',
  Deleting: 'bg-orange-500',
}

interface PhaseBarProps {
  phases: Record<string, number>
  total: number
  to?: string
}

export function PhaseBar({ phases, total, to }: PhaseBarProps) {
  if (total === 0) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">No NodeClaims</span>
  }

  const segments = phaseOrder
    .filter((p) => (phases[p] ?? 0) > 0)
    .map((p) => ({
      phase: p,
      count: phases[p] ?? 0,
      pct: total > 0 ? ((phases[p] ?? 0) / total) * 100 : 0,
      color: phaseColors[p] ?? 'bg-gray-500',
    }))

  const content = (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {segments.map(({ phase, pct, color }) => (
          <div
            key={phase}
            className={`${color} transition-all`}
            style={{ width: `${Math.max(pct, 2)}%` }}
            title={`${phase}: ${phases[phase] ?? 0}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
        {segments.map(({ phase, count }) => (
          <span key={phase} title={`${phase}: ${count}`}>
            {phase} {count}
          </span>
        ))}
      </div>
    </div>
  )

  if (to) {
    return <Link to={to} className="block hover:opacity-90 transition">{content}</Link>
  }
  return content
}
