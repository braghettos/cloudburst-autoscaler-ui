interface EmptyStateProps {
  title: string
  description?: string
  /** Optional wrapper className (e.g. rounded-lg border for cards) */
  className?: string
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className ?? ''}`}>
      <p className="text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{description}</p>}
    </div>
  )
}
