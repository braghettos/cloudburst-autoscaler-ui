import { Link, useParams } from 'react-router-dom'
import { useNodePool } from '../api/hooks'

export function NodePoolDetailPage() {
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const { data: pool, isLoading, isError, error } = useNodePool(namespace, name)

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded" />
  }
  if (isError || !pool) {
    return (
      <div className="text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : 'NodePool not found'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to="/nodepools" className="hover:text-primary-600">Node Pools</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{pool.namespace}/{pool.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{pool.namespace}/{pool.name}</h2>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Region Constraint</dt>
          <dd>{pool.regionConstraint}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Min Nodes</dt>
          <dd>{pool.minNodes}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Max Nodes</dt>
          <dd>{pool.maxNodes}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Node Claims</dt>
          <dd>
            <Link to={`/nodeclaims?namespace=${pool.namespace}`} className="text-primary-600 hover:underline">
              {pool.nodeClaimCount}
            </Link>
          </dd>
        </dl>
      </div>
    </div>
  )
}
