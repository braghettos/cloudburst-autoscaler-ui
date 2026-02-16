import { Link, useParams } from 'react-router-dom'
import { useNodeClaim } from '../api/hooks'
import { StatusBadge } from '../components/StatusBadge'

export function NodeClaimDetailPage() {
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const { data: claim, isLoading, isError, error } = useNodeClaim(namespace, name)

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded" />
  }
  if (isError || !claim) {
    return (
      <div className="text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : 'NodeClaim not found'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to="/nodeclaims" className="hover:text-primary-600">Node Claims</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{claim.namespace}/{claim.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          {claim.namespace}/{claim.name}
          <StatusBadge phase={claim.phase} />
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Phase</dt>
          <dd>{claim.phase}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Node Pool</dt>
          <dd>
            <Link
              to={`/nodepools/${claim.namespace}/${claim.nodePoolRef}`}
              className="text-primary-600 hover:underline"
            >
              {claim.nodePoolRef}
            </Link>
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">Node</dt>
          <dd>
            {claim.nodeName ? (
              <Link to={`/nodes/${claim.nodeName}`} className="text-primary-600 hover:underline">
                {claim.nodeName}
              </Link>
            ) : (
              '-'
            )}
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">Provider</dt>
          <dd>{claim.provider || '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Region</dt>
          <dd>{claim.region || '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Instance Type</dt>
          <dd>{claim.instanceType || '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">vCPU / RAM</dt>
          <dd>{claim.vcpu} vCPU, {claim.ramGb} GiB</dd>
          <dt className="text-gray-500 dark:text-gray-400">Price</dt>
          <dd>€{claim.priceEurPerHour?.toFixed(4) ?? '0'}/h</dd>
          {claim.instanceID && (
            <>
              <dt className="text-gray-500 dark:text-gray-400">Instance ID</dt>
              <dd className="font-mono text-sm">{claim.instanceID}</dd>
            </>
          )}
          {claim.lastError && (
            <>
              <dt className="text-gray-500 dark:text-gray-400">Error</dt>
              <dd className="text-red-600 dark:text-red-400">{claim.lastError}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}
