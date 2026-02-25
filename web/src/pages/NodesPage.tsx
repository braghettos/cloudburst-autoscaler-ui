import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useNodes } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import type { NodeSummary } from '../types/api'

export function NodesPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: nodes = [], isLoading, isError, error } = useNodes(apiClusterId)

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
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nodes</h1>
      <div className="flex flex-wrap gap-4 items-center">
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
          rowKey={(n) => n.name}
          onRowClick={(n) => navigate(clusterPath(clusterId, `/nodes/${n.name}`))}
          emptyMessage="No nodes"
        />
      )}
    </div>
  )
}
