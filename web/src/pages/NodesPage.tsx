import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useNodes } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar, FilterField, FilterInput, FilterActions } from '../components/FilterBar'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { RefreshCw } from 'lucide-react'
import type { NodeSummary } from '../types/api'

export function NodesPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: nodes = [], isLoading, isError, error, refetch, isFetching } = useNodes(apiClusterId)

  const filtered = nodes.filter((n) => !search || n.name.includes(search))

  const columns: Column<NodeSummary>[] = [
    { key: 'name', header: 'Name', render: (n) => n.name },
    {
      key: 'cloudburst',
      header: 'CloudBurst',
      render: (n) => (n.cloudburstManaged ? 'Yes' : 'No'),
    },
    { key: 'ready', header: 'Ready', render: (n) => (n.ready ? 'Yes' : 'No') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nodes</h1>
        <FilterBar>
          <FilterField id="nodes-search" label="Search">
            <FilterInput
              id="nodes-search"
              type="search"
              placeholder="Node name..."
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
          rowKey={(n) => n.name}
          onRowClick={(n) => navigate(clusterPath(clusterId, `/nodes/${n.name}`))}
          emptyMessage="No nodes"
        />
      )}
    </div>
  )
}
