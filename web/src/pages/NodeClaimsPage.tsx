import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useNodeClaims } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import type { NodeClaimSummary } from '../types/api'

export function NodeClaimsPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [searchParams] = useSearchParams()
  const [namespace, setNamespace] = useState(searchParams.get('namespace') ?? '')
  const [phase, setPhase] = useState(searchParams.get('phase') ?? '')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: claims = [], isLoading, isError, error } = useNodeClaims({
    clusterId: apiClusterId,
    namespace: namespace || undefined,
    phase: phase || undefined,
  })

  const filtered = claims.filter(
    (c) => !search || c.name.includes(search) || c.namespace.includes(search)
  )

  const columns: Column<NodeClaimSummary>[] = [
    { key: 'namespace', header: 'Namespace', render: (c) => c.namespace },
    { key: 'name', header: 'Name', render: (c) => c.name },
    { key: 'phase', header: 'Phase', render: (c) => <StatusBadge phase={c.phase} /> },
    { key: 'pool', header: 'Node Pool', render: (c) => c.nodePoolRef },
    { key: 'provider', header: 'Provider', render: (c) => c.provider || '-' },
    { key: 'region', header: 'Region', render: (c) => c.region || '-' },
    { key: 'type', header: 'Instance', render: (c) => c.instanceType || '-' },
    { key: 'node', header: 'Node', render: (c) => c.nodeName || '-' },
    { key: 'error', header: 'Error', render: (c) => (c.lastError ? <span className="text-red-600 dark:text-red-400 truncate max-w-xs block">{c.lastError}</span> : '-') },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Node Claims</h1>
      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Namespace"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        />
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        >
          <option value="">All Phases</option>
          <option value="Pending">Pending</option>
          <option value="Provisioning">Provisioning</option>
          <option value="Joining">Joining</option>
          <option value="Ready">Ready</option>
          <option value="Failed">Failed</option>
          <option value="Deleting">Deleting</option>
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        />
      </div>
      {isLoading && <LoadingSkeleton variant="list" />}
      {isError && <ErrorAlert error={error ?? new Error('Failed to load')} />}
      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(c) => `${c.namespace}/${c.name}`}
          onRowClick={(c) => navigate(clusterPath(clusterId, `/nodeclaims/${c.namespace}/${c.name}`))}
          emptyMessage="No node claims"
        />
      )}
    </div>
  )
}
