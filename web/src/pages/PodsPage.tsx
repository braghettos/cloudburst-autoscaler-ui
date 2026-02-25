import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { usePods } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import type { PodSummary } from '../types/api'

export function PodsPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [searchParams] = useSearchParams()
  const phaseFromUrl = searchParams.get('phase') ?? ''
  const [namespace, setNamespace] = useState(searchParams.get('namespace') ?? '')
  const [phase, setPhase] = useState(phaseFromUrl)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: pods = [], isLoading, isError, error } = usePods({
    clusterId: apiClusterId,
    namespace: namespace || undefined,
    phase: phase || undefined,
  })

  const filtered = pods.filter((p) => !search || p.name.includes(search) || p.namespace.includes(search))

  const columns: Column<PodSummary>[] = [
    { key: 'namespace', header: 'Namespace', render: (p) => p.namespace },
    { key: 'name', header: 'Name', render: (p) => p.name },
    { key: 'phase', header: 'Phase', render: (p) => <StatusBadge phase={p.phase} /> },
    { key: 'node', header: 'Node', render: (p) => p.nodeName || '-' },
    { key: 'cpu', header: 'CPU', render: (p) => p.cpuRequest || '-' },
    { key: 'memory', header: 'Memory', render: (p) => p.memoryRequest || '-' },
    {
      key: 'unschedulable',
      header: 'Unschedulable',
      render: (p) => (p.unschedulable ? p.unschedulableMsg || 'Yes' : '-'),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Pods</h1>
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
          <option value="Running">Running</option>
          <option value="Succeeded">Succeeded</option>
          <option value="Failed">Failed</option>
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
          rowKey={(p) => `${p.namespace}/${p.name}`}
          onRowClick={(p) => navigate(clusterPath(clusterId, `/pods/${p.namespace}/${p.name}`))}
          emptyMessage="No pods"
        />
      )}
    </div>
  )
}
