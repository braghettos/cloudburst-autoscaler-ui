import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { useEvents } from '../api/hooks'
import { DataTable, type Column } from '../components/DataTable'
import { FilterBar, FilterField, FilterInput, FilterSelect, FilterActions } from '../components/FilterBar'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { RefreshCw, Pause, Play, Activity } from 'lucide-react'
import type { EventSummary } from '../types/api'

export function EventsPage() {
  const { apiClusterId } = useCluster()
  const [searchParams, setSearchParams] = useSearchParams()
  const namespace = searchParams.get('namespace') ?? ''
  const eventType = searchParams.get('type') ?? ''
  const filter = searchParams.get('filter') ?? ''
  const [paused, setPaused] = useState(false)

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setSearchParams(next, { replace: true })
  }

  const { data: events = [], isLoading, isError, error, refetch, isFetching } = useEvents(
    {
      clusterId: apiClusterId,
      namespace: namespace || undefined,
      type: eventType || undefined,
      limit: 500,
    },
    paused
  )

  const filtered = useMemo(() => {
    let list = events
    if (filter.trim()) {
      const lower = filter.toLowerCase()
      list = events.filter(
        (e) =>
          e.reason.toLowerCase().includes(lower) ||
          e.message.toLowerCase().includes(lower) ||
          e.involvedKind.toLowerCase().includes(lower) ||
          e.involvedName.toLowerCase().includes(lower) ||
          (e.involvedNamespace && e.involvedNamespace.toLowerCase().includes(lower))
      )
    }
    // Most recent first (order by lastTimestamp descending)
    return [...list].sort((a, b) => {
      const ta = a.lastTimestamp ?? ''
      const tb = b.lastTimestamp ?? ''
      return tb > ta ? 1 : tb < ta ? -1 : 0
    })
  }, [events, filter])

  const columns: Column<EventSummary>[] = [
    {
      key: 'lastTimestamp',
      header: 'Last Seen',
      render: (e) =>
        e.lastTimestamp
          ? new Date(e.lastTimestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '-',
      sortable: true,
      sortKey: (e) => e.lastTimestamp ?? '',
    },
    {
      key: 'type',
      header: 'Type',
      render: (e) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
            e.type === 'Warning'
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {e.type || 'Normal'}
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', render: (e) => e.reason || '-', sortable: true, sortKey: 'reason' },
    {
      key: 'object',
      header: 'Object',
      render: (e) => {
        const ns = e.involvedNamespace || e.namespace
        const obj = e.involvedKind && e.involvedName ? `${e.involvedKind}/${e.involvedName}` : '-'
        return ns ? `${ns}/${obj}` : obj
      },
    },
    { key: 'message', header: 'Message', render: (e) => e.message || '-' },
    {
      key: 'count',
      header: 'Count',
      render: (e) => (e.count > 1 ? String(e.count) : '-'),
    },
  ]

  const eventTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Warning', label: 'Warning' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Activity className="w-5 h-5" aria-hidden />
          Kubernetes Events
        </h1>
        <FilterBar>
          <FilterField id="events-namespace" label="Namespace">
            <FilterInput
              id="events-namespace"
              placeholder="All"
              value={namespace}
              onChange={(e) => updateParams({ namespace: e.target.value })}
              className="w-32"
            />
          </FilterField>
          <FilterField id="events-type" label="Type">
            <FilterSelect
              id="events-type"
              value={eventType}
              onChange={(e) => updateParams({ type: e.target.value })}
              options={eventTypeOptions}
              className="w-28"
            />
          </FilterField>
          <FilterField id="events-filter" label="Search">
            <FilterInput
              id="events-filter"
              type="search"
              placeholder="Reason, message, object..."
              value={filter}
              onChange={(e) => updateParams({ filter: e.target.value })}
              className="w-40 sm:w-56"
            />
          </FilterField>
          <FilterActions>
            <button
              onClick={() => setPaused((p) => !p)}
              title={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
              aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                paused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
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
      {isError && (
        <ErrorAlert
          error={error ?? new Error('Failed to load')}
          title="Failed to load events"
        />
      )}
      {!isLoading && !isError && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
            Results
          </h2>
          <DataTable
          columns={columns}
          data={filtered}
          rowKey={(e) => `${e.namespace}/${e.name}`}
          emptyMessage="No events"
          emptyDescription="Kubernetes events will appear here as resources are created and updated."
          paginationThreshold={25}
        />
        </>
      )}
    </div>
  )
}
