import { Link, useParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { useNodePool } from '../api/hooks'
import { clusterPath } from '../utils/routes'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function NodePoolDetailPage() {
  const { clusterId, apiClusterId } = useCluster()
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const { data: pool, isLoading, isError, error } = useNodePool(apiClusterId, namespace, name)

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />
  }
  if (isError || !pool) {
    return <ErrorAlert error={error ?? new Error('NodePool not found')} title="NodePool not found" />
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to={clusterId ? clusterPath(clusterId, '/overview') : '/'} className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to={clusterPath(clusterId, '/nodepools')} className="hover:text-primary-600">Node Pools</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{pool.namespace}/{pool.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">{pool.namespace}/{pool.name}</h1>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Region Constraint</dt>
          <dd>{pool.regionConstraint}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Min Nodes</dt>
          <dd>{pool.minNodes}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Max Nodes</dt>
          <dd>{pool.maxNodes}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Node Claims</dt>
          <dd>
            <Link to={clusterPath(clusterId, `/nodeclaims?namespace=${pool.namespace}`)} className="text-primary-600 hover:underline">
              {pool.nodeClaimCount}
            </Link>
          </dd>
        </dl>
      </div>
    </div>
  )
}
