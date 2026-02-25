import { Link, useParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { usePod } from '../api/hooks'
import { Breadcrumb } from '../components/Breadcrumb'
import { StatusBadge } from '../components/StatusBadge'
import { clusterPath } from '../utils/routes'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function PodDetailPage() {
  const { clusterId, apiClusterId } = useCluster()
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const { data: pod, isLoading, isError, error } = usePod(apiClusterId, namespace, name)

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />
  }
  if (isError || !pod) {
    return <ErrorAlert error={error ?? new Error('Pod not found')} title="Pod not found" />
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: 'Overview', to: clusterId ? clusterPath(clusterId, '/overview') : '/' },
          { label: 'Pods', to: clusterPath(clusterId, '/pods') },
          { label: `${pod.namespace}/${pod.name}` },
        ]}
      />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
          {pod.namespace}/{pod.name}
          <StatusBadge phase={pod.phase} />
        </h1>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Phase</dt>
          <dd>{pod.phase}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Node</dt>
          <dd>
            {pod.nodeName ? (
              <Link to={clusterPath(clusterId, `/nodes/${pod.nodeName}`)} className="text-primary-600 hover:underline">
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
