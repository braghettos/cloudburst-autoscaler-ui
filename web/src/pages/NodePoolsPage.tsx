import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useNodePools } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import type { NodePoolSummary } from '../types/api'

export function NodePoolsPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [namespace, setNamespace] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: pools = [], isLoading, isError, error } = useNodePools({
    clusterId: apiClusterId,
    namespace: namespace || undefined,
  })

  const filtered = pools.filter(
    (p) => !search || p.name.includes(search) || p.namespace.includes(search)
  )

  const columns: Column<NodePoolSummary>[] = [
    { key: 'namespace', header: 'Namespace', render: (p) => p.namespace },
    { key: 'name', header: 'Name', render: (p) => p.name },
    { key: 'region', header: 'Region', render: (p) => p.regionConstraint },
    {
      key: 'limits',
      header: 'Min/Max Nodes',
      render: (p) => `${p.minNodes}/${p.maxNodes}`,
    },
    { key: 'claims', header: 'Node Claims', render: (p) => p.nodeClaimCount },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Node Pools</h1>
      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Namespace"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
        />
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
          rowKey={(p) => `${p.namespace}/${p.name}`}
          onRowClick={(p) => navigate(clusterPath(clusterId, `/nodepools/${p.namespace}/${p.name}`))}
          emptyMessage="No node pools"
        />
      )}
    </div>
  )
}
