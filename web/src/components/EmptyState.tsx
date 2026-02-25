import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
  /** External link (opens in same tab) */
  href?: string
  /** React Router path for internal navigation */
  to?: string
}

const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-500'
const btnSecondary =
  'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 text-sm font-medium text-gray-700 dark:text-gray-200 transition focus:outline-none focus:ring-2 focus:ring-primary-500'

function renderAction(action: EmptyStateAction, primary: boolean) {
  const cls = primary ? btnPrimary : btnSecondary
  if (action.to) {
    return (
      <Link to={action.to} className={cls}>
        {action.label}
      </Link>
    )
  }
  if (action.href) {
    return (
      <a href={action.href} className={cls}>
        {action.label}
      </a>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {action.label}
    </button>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  /** Optional wrapper className (e.g. rounded-lg border for cards) */
  className?: string
  /** Optional icon component from lucide-react */
  icon?: LucideIcon
  /** Primary CTA (button or link) */
  primaryAction?: EmptyStateAction
  /** Secondary CTA */
  secondaryAction?: EmptyStateAction
}

export function EmptyState({
  title,
  description,
  className = '',
  icon: Icon,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon className="w-12 h-12 text-gray-400 dark:text-gray-500" aria-hidden />
        </div>
      )}
      <p className="text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {primaryAction && renderAction(primaryAction, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  )
}
