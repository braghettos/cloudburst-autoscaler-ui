import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { usePods } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar, FilterField, FilterInput, FilterSelect, FilterActions } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { RefreshCw, Layers } from 'lucide-react'
import type { PodSummary } from '../types/api'

export function PodsPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [searchParams] = useSearchParams()
  const phaseFromUrl = searchParams.get('phase') ?? ''
  const [namespace, setNamespace] = useState(searchParams.get('namespace') ?? '')
  const [phase, setPhase] = useState(phaseFromUrl)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: pods = [], isLoading, isError, error, refetch, isFetching } = usePods({
    clusterId: apiClusterId,
    namespace: namespace || undefined,
    phase: phase || undefined,
  })

  const filtered = pods.filter((p) => !search || p.name.includes(search) || p.namespace.includes(search))

  const columns: Column<PodSummary>[] = [
    { key: 'namespace', header: 'Namespace', render: (p) => p.namespace, sortable: true, sortKey: 'namespace', sticky: true },
    { key: 'name', header: 'Name', render: (p) => p.name, sortable: true, sortKey: 'name' },
    { key: 'phase', header: 'Phase', render: (p) => <StatusBadge phase={p.phase} />, sortable: true, sortKey: 'phase' },
    { key: 'node', header: 'Node', render: (p) => p.nodeName || '-', sortable: true, sortKey: 'nodeName' },
    { key: 'cpu', header: 'CPU', render: (p) => p.cpuRequest || '-' },
    { key: 'memory', header: 'Memory', render: (p) => p.memoryRequest || '-' },
    {
      key: 'unschedulable',
      header: 'Unschedulable',
      render: (p) => (p.unschedulable ? p.unschedulableMsg || 'Yes' : '-'),
    },
  ]

  const phaseOptions = [
    { value: '', label: 'All Phases' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Running', label: 'Running' },
    { value: 'Succeeded', label: 'Succeeded' },
    { value: 'Failed', label: 'Failed' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pods</h1>
        <FilterBar>
          <FilterField id="pods-namespace" label="Namespace">
            <FilterInput
              id="pods-namespace"
              placeholder="All"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-32"
            />
          </FilterField>
          <FilterField id="pods-phase" label="Phase">
            <FilterSelect
              id="pods-phase"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              options={phaseOptions}
              className="w-36"
            />
          </FilterField>
          <FilterField id="pods-search" label="Search">
            <FilterInput
              id="pods-search"
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
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
            Results
          </h2>
          <DataTable
          columns={columns}
          data={filtered}
          rowKey={(p) => `${p.namespace}/${p.name}`}
          onRowClick={(p) => navigate(clusterPath(clusterId, `/pods/${p.namespace}/${p.name}`))}
          emptyMessage="No pods"
          emptyDescription="Deploy workloads to see pods. Pending pods trigger NodeClaim creation."
          emptyIcon={Layers}
          emptyPrimaryAction={clusterId ? { label: 'View Node Pools', to: clusterPath(clusterId, '/nodepools') } : undefined}
          emptySecondaryAction={clusterId ? { label: 'Resource Graph', to: clusterPath(clusterId, '/graph') } : undefined}
          paginationThreshold={25}
        />
        </>
      )}
    </div>
  )
}
