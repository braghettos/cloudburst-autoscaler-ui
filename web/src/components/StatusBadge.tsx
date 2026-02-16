const phaseColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  provisioning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  joining: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  deleting: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  running: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export function StatusBadge({ phase }: { phase: string }) {
  const p = (phase || '').toLowerCase()
  const className = phaseColors[p] ?? phaseColors.pending
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${className}`}>
      {phase || 'Pending'}
    </span>
  )
}
