import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useNodePools } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar, FilterField, FilterInput, FilterActions } from '../components/FilterBar'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { RefreshCw } from 'lucide-react'
import type { NodePoolSummary } from '../types/api'

export function NodePoolsPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [namespace, setNamespace] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: pools = [], isLoading, isError, error, refetch, isFetching } = useNodePools({
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Node Pools</h1>
        <FilterBar>
          <FilterField id="np-namespace" label="Namespace">
            <FilterInput
              id="np-namespace"
              placeholder="All"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-32"
            />
          </FilterField>
          <FilterField id="np-search" label="Search">
            <FilterInput
              id="np-search"
              type="search"
              placeholder="Name or namespace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 sm:w-48"
            />
          </FilterField>
          <FilterActions>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </FilterActions>
        </FilterBar>
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
