import { useRef, useEffect } from 'react'

interface ErrorAlertProps {
  error: Error | unknown
  title?: string
  /** Optional hint shown when not 404 (e.g. "Check kubeconfig") */
  hint?: string
  /** Use "Cluster not found" for 404 instead of "Not found" */
  variant?: 'default' | 'cluster'
  /** Optional retry callback */
  onRetry?: () => void
  /** Show "Copy error" button for debugging */
  showCopy?: boolean
}

function getErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function ErrorAlert({
  error,
  title,
  hint,
  variant = 'default',
  onRetry,
  showCopy = false,
}: ErrorAlertProps) {
  const msg = getErrorMessage(error)
  const is404 = typeof msg === 'string' && msg.startsWith('404')
  const is500 = typeof msg === 'string' && msg.startsWith('500')
  const isClusterNotFound =
    typeof msg === 'string' &&
    (msg.toLowerCase().includes('cluster not found') || msg.toLowerCase().includes('clusterid required'))

  const defaultTitle =
    is404 || (variant === 'cluster' && isClusterNotFound)
      ? variant === 'cluster'
        ? 'Cluster not found'
        : 'Not found'
      : is500
        ? 'Server error'
        : 'Failed to load'
  const displayTitle = title ?? defaultTitle
  const clusterHint =
    hint ??
    (isClusterNotFound || variant === 'cluster'
      ? 'Set KUBECONFIG to your kubeconfig and restart the UI server (not the browser).'
      : undefined)

  const retryRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (onRetry) retryRef.current?.focus()
  }, [onRetry])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${displayTitle}\n${msg}${clusterHint ? `\n${clusterHint}` : ''}`)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="alert"
      className="rounded-xl p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
    >
      <p className="font-medium">{displayTitle}</p>
      <p className="text-sm mt-1">{msg}</p>
      {clusterHint && <p className="text-sm mt-1 opacity-90">{clusterHint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && (
          <button
            ref={retryRef}
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium bg-red-100 dark:bg-red-800/40 hover:bg-red-200 dark:hover:bg-red-800/60 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        )}
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 text-sm font-medium bg-red-100 dark:bg-red-800/40 hover:bg-red-200 dark:hover:bg-red-800/60 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Copy error
          </button>
        )}
      </div>
    </div>
  )
}
