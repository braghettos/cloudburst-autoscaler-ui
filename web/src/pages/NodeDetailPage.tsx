import { Link, useParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { useNode } from '../api/hooks'
import { clusterPath } from '../utils/routes'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function NodeDetailPage() {
  const { clusterId, apiClusterId } = useCluster()
  const { name = '' } = useParams<{ name: string }>()
  const { data: node, isLoading, isError, error } = useNode(apiClusterId, name)

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />
  }
  if (isError || !node) {
    return <ErrorAlert error={error ?? new Error('Node not found')} title="Node not found" />
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to={clusterId ? clusterPath(clusterId, '/overview') : '/'} className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to={clusterPath(clusterId, '/nodes')} className="hover:text-primary-600">Nodes</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{node.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">{node.name}</h1>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">CloudBurst Managed</dt>
          <dd>{node.cloudburstManaged ? 'Yes' : 'No'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Ready</dt>
          <dd>{node.ready ? 'Yes' : 'No'}</dd>
        </dl>
      </div>
    </div>
  )
}
