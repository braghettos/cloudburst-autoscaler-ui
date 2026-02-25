/* WCAG AA contrast: -800/-900 text on -100 bg (light), -300 text on -900/50 bg (dark) */
const phaseColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  provisioning: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200',
  joining: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-200',
  ready: 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-200',
  failed: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200',
  deleting: 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200',
  running: 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-200',
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
