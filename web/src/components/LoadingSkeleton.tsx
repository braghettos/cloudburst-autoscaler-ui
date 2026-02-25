type LoadingSkeletonVariant = 'list' | 'detail' | 'graph' | 'page'

interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant
}

const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'

export function LoadingSkeleton({ variant = 'list' }: LoadingSkeletonProps) {
  const containerProps = {
    'aria-busy': true as const,
    'aria-live': 'polite' as const,
  }

  if (variant === 'list') {
    return (
      <div
        className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        {...containerProps}
      >
        <div className="min-w-full">
          <div className={`h-12 ${baseClasses} mb-1`} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-12 ${baseClasses} mb-1`} />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'detail') {
    return <div className={`h-48 ${baseClasses}`} {...containerProps} />
  }

  if (variant === 'graph') {
    return <div className={`h-96 ${baseClasses}`} {...containerProps} />
  }

  // variant === 'page' - generic page skeleton
  return (
    <div className="animate-pulse space-y-6" {...containerProps}>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
