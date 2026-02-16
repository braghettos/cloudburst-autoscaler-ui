import { Link, useParams } from 'react-router-dom'
import { usePod } from '../api/hooks'
import { StatusBadge } from '../components/StatusBadge'

export function PodDetailPage() {
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const { data: pod, isLoading, isError, error } = usePod(namespace, name)

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded" />
  }
  if (isError || !pod) {
    return (
      <div className="text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : 'Pod not found'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to="/pods" className="hover:text-primary-600">Pods</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{pod.namespace}/{pod.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          {pod.namespace}/{pod.name}
          <StatusBadge phase={pod.phase} />
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Phase</dt>
          <dd>{pod.phase}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Node</dt>
          <dd>
            {pod.nodeName ? (
              <Link to={`/nodes/${pod.nodeName}`} className="text-primary-600 hover:underline">
                {pod.nodeName}
              </Link>
            ) : (
              '-'
            )}
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">CPU Request</dt>
          <dd>{pod.cpuRequest || '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Memory Request</dt>
          <dd>{pod.memoryRequest || '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Unschedulable</dt>
          <dd>{pod.unschedulable ? (pod.unschedulableMsg || 'Yes') : 'No'}</dd>
        </dl>
      </div>
    </div>
  )
}
