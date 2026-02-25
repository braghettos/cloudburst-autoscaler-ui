import { useParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { useNode } from '../api/hooks'
import { Breadcrumb } from '../components/Breadcrumb'
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
      <Breadcrumb
        items={[
          { label: 'Overview', to: clusterId ? clusterPath(clusterId, '/overview') : '/' },
          { label: 'Nodes', to: clusterPath(clusterId, '/nodes') },
          { label: node.name },
        ]}
      />
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
