import { StatusBadge } from './StatusBadge'

const phases = ['Pending', 'Provisioning', 'Joining', 'Ready', 'Failed', 'Deleting']

export function LifecycleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-6">
      {phases.map((p) => (
        <span key={p} className="flex items-center gap-1">
          <StatusBadge phase={p} />
          {p !== phases[phases.length - 1] && <span className="text-gray-400 mx-1">→</span>}
        </span>
      ))}
    </div>
  )
}
