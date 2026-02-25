import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useNodeClaims } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar, FilterField, FilterInput, FilterSelect, FilterActions } from '../components/FilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { LifecycleLegend } from '../components/LifecycleLegend'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { RefreshCw, Cpu } from 'lucide-react'
import type { NodeClaimSummary } from '../types/api'

export function NodeClaimsPage() {
  const { clusterId, apiClusterId } = useCluster()
  const [searchParams] = useSearchParams()
  const [namespace, setNamespace] = useState(searchParams.get('namespace') ?? '')
  const [phase, setPhase] = useState(searchParams.get('phase') ?? '')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data: claims = [], isLoading, isError, error, refetch, isFetching } = useNodeClaims({
    clusterId: apiClusterId,
    namespace: namespace || undefined,
    phase: phase || undefined,
  })

  const filtered = claims.filter(
    (c) => !search || c.name.includes(search) || c.namespace.includes(search)
  )

  const columns: Column<NodeClaimSummary>[] = [
    { key: 'namespace', header: 'Namespace', render: (c) => c.namespace, sortable: true, sortKey: 'namespace', sticky: true },
    { key: 'name', header: 'Name', render: (c) => c.name, sortable: true, sortKey: 'name' },
    { key: 'phase', header: 'Phase', render: (c) => <StatusBadge phase={c.phase} />, sortable: true, sortKey: 'phase' },
    { key: 'pool', header: 'Node Pool', render: (c) => c.nodePoolRef, sortable: true, sortKey: 'nodePoolRef' },
    { key: 'provider', header: 'Provider', render: (c) => c.provider || '-', sortable: true, sortKey: 'provider' },
    { key: 'region', header: 'Region', render: (c) => c.region || '-' },
    { key: 'type', header: 'Instance', render: (c) => c.instanceType || '-' },
    { key: 'node', header: 'Node', render: (c) => c.nodeName || '-' },
    { key: 'error', header: 'Error', render: (c) => (c.lastError ? <span className="text-red-600 dark:text-red-400 truncate max-w-xs block">{c.lastError}</span> : '-') },
  ]

  const phaseOptions = [
    { value: '', label: 'All Phases' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Provisioning', label: 'Provisioning' },
    { value: 'Joining', label: 'Joining' },
    { value: 'Ready', label: 'Ready' },
    { value: 'Failed', label: 'Failed' },
    { value: 'Deleting', label: 'Deleting' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Node Claims</h1>
        <FilterBar>
          <FilterField id="nc-namespace" label="Namespace">
            <FilterInput
              id="nc-namespace"
              placeholder="All"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="w-32"
            />
          </FilterField>
          <FilterField id="nc-phase" label="Phase">
            <FilterSelect
              id="nc-phase"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              options={phaseOptions}
              className="w-36"
            />
          </FilterField>
          <FilterField id="nc-search" label="Search">
            <FilterInput
              id="nc-search"
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
      <LifecycleLegend />
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
          rowKey={(c) => `${c.namespace}/${c.name}`}
          onRowClick={(c) => navigate(clusterPath(clusterId, `/nodeclaims/${c.namespace}/${c.name}`))}
          emptyMessage="No node claims"
          emptyDescription="NodeClaims are created when pending pods need capacity. Create a NodePool and deploy workloads."
          emptyIcon={Cpu}
          emptyPrimaryAction={clusterId ? { label: 'View Node Pools', to: clusterPath(clusterId, '/nodepools') } : undefined}
          emptySecondaryAction={clusterId ? { label: 'View Pods', to: clusterPath(clusterId, '/pods') } : undefined}
          paginationThreshold={25}
        />
        </>
      )}
    </div>
  )
}
