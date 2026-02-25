import { Link, useParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { useNodeClaim } from '../api/hooks'
import { StatusBadge } from '../components/StatusBadge'
import { clusterPath } from '../utils/routes'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function NodeClaimDetailPage() {
  const { clusterId, apiClusterId } = useCluster()
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const { data: claim, isLoading, isError, error } = useNodeClaim(apiClusterId, namespace, name)

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />
  }
  if (isError || !claim) {
    return <ErrorAlert error={error ?? new Error('NodeClaim not found')} title="NodeClaim not found" />
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to={clusterId ? clusterPath(clusterId, '/overview') : '/'} className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to={clusterPath(clusterId, '/nodeclaims')} className="hover:text-primary-600">Node Claims</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{claim.namespace}/{claim.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4 flex items-center gap-2">
          {claim.namespace}/{claim.name}
          <StatusBadge phase={claim.phase} />
        </h1>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">Phase</dt>
          <dd>{claim.phase}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Node Pool</dt>
          <dd>
            <Link
              to={clusterPath(clusterId, `/nodepools/${claim.namespace}/${claim.nodePoolRef}`)}
              className="text-primary-600 hover:underline"
            >
              {claim.nodePoolRef}
            </Link>
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">Node</dt>
          <dd>
            {claim.nodeName ? (
              <Link to={clusterPath(clusterId, `/nodes/${claim.nodeName}`)} className="text-primary-600 hover:underline">
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
          {claim.recommendationRequest && (
            <>
              <dt className="text-gray-500 dark:text-gray-400 col-span-2 mt-2">CloudBroker Recommendation Request</dt>
              <dd className="col-span-2">
                <div className="mt-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Min vCPU</span>
                    <span>{claim.recommendationRequest.minVcpu}</span>
                    <span className="text-gray-500 dark:text-gray-400">Min RAM (GiB)</span>
                    <span>{claim.recommendationRequest.minRamGb}</span>
                    {claim.recommendationRequest.regionConstraint && (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">Region Constraint</span>
                        <span>{claim.recommendationRequest.regionConstraint}</span>
                      </>
                    )}
                    <span className="text-gray-500 dark:text-gray-400">Max Price (€/h)</span>
                    <span>€{claim.recommendationRequest.maxPriceEurPerHour?.toFixed(4) ?? '0'}/h</span>
                    {claim.recommendationRequest.arch && (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">Arch</span>
                        <span>{claim.recommendationRequest.arch}</span>
                      </>
                    )}
                    {claim.recommendationRequest.allowedProviders?.length ? (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">Allowed Providers</span>
                        <span>{claim.recommendationRequest.allowedProviders.join(', ')}</span>
                      </>
                    ) : null}
                    {claim.recommendationRequest.dataSourceProvider && (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">TCO Data Source</span>
                        <span>{claim.recommendationRequest.dataSourceProvider}/{claim.recommendationRequest.dataSourceRegion ?? '-'}</span>
                        <span className="text-gray-500 dark:text-gray-400">Max TCO (€/h)</span>
                        <span>€{claim.recommendationRequest.maxTCOEurPerHour?.toFixed(4) ?? '-'}/h</span>
                      </>
                    )}
                  </div>
                </div>
              </dd>
            </>
          )}
          {claim.recommendationUsed && (
            <>
              <dt className="text-gray-500 dark:text-gray-400 col-span-2 mt-2">CloudBroker Recommendation Used</dt>
              <dd className="col-span-2">
                <div className="mt-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Provider</span>
                    <span>{claim.recommendationUsed.provider}</span>
                    <span className="text-gray-500 dark:text-gray-400">Region</span>
                    <span>{claim.recommendationUsed.region}</span>
                    <span className="text-gray-500 dark:text-gray-400">Instance Type</span>
                    <span>{claim.recommendationUsed.instanceType}</span>
                    <span className="text-gray-500 dark:text-gray-400">vCPU / RAM</span>
                    <span>{claim.recommendationUsed.vcpu} vCPU, {claim.recommendationUsed.ramGb} GiB</span>
                    <span className="text-gray-500 dark:text-gray-400">Price</span>
                    <span>€{claim.recommendationUsed.priceEurPerHour?.toFixed(4) ?? '0'}/h</span>
                  </div>
                </div>
              </dd>
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
