import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { useControllerMetrics } from '../api/hooks'
import { RefreshCw, Copy, Check, BarChart2, ChevronDown, ChevronRight } from 'lucide-react'
import { FilterBar, FilterField, FilterInput, FilterActions } from '../components/FilterBar'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  parsePrometheusMetrics,
  getSamples,
  getHistogramMeans,
} from '../utils/parsePrometheus'

const COLORS = [
  '#0d6efd', // primary
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
]

/** Truncate long x-axis labels to improve readability when there are many. */
function truncateTick(value: string, maxLen = 14): string {
  if (!value || value.length <= maxLen) return value
  return `${value.slice(0, maxLen - 1)}…`
}

/** X-axis interval: show fewer ticks when many categories to avoid overlap. */
function xAxisInterval(dataLength: number): number {
  if (dataLength <= 8) return 0
  if (dataLength <= 16) return 1
  return Math.ceil(dataLength / 8)
}

export function MetricsPage() {
  const { apiClusterId } = useCluster()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('filter') ?? 'cloudburst'
  const [copied, setCopied] = useState(false)
  const [rawOutputExpanded, setRawOutputExpanded] = useState(false)

  const setFilter = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('filter', value)
    else next.delete('filter')
    setSearchParams(next, { replace: true })
  }
  const { data, isLoading, isError, error, refetch, isFetching } =
    useControllerMetrics(apiClusterId, 15000)

  const parsed = useMemo(() => {
    const raw = data?.metrics ?? ''
    return parsePrometheusMetrics(raw)
  }, [data?.metrics])

  const filteredMetrics = useMemo(() => {
    const raw = data?.metrics ?? ''
    if (!filter.trim()) return raw
    const lines = raw.split('\n')
    const lower = filter.toLowerCase()
    return lines.filter((line) => line.toLowerCase().includes(lower)).join('\n')
  }, [data?.metrics, filter])

  const cloudburstMetrics = useMemo(() => {
    const raw = data?.metrics ?? ''
    return raw
      .split('\n')
      .filter((line) => line.startsWith('cloudburst_') && !line.startsWith('#'))
  }, [data?.metrics])

  // Chart data from parsed metrics
  const nodeClaimsActiveData = useMemo(() => {
    const samples = getSamples(parsed, 'cloudburst_nodeclaims_active')
    return samples.map((s) => ({
      name: `${s.labels.provider || 'default'}/${s.labels.phase || '?'}`,
      value: s.value,
      provider: s.labels.provider,
      phase: s.labels.phase,
    }))
  }, [parsed])

  const providerErrorsData = useMemo(() => {
    const samples = getSamples(parsed, 'cloudburst_provider_errors_total')
    return samples.map((s) => ({
      name: `${s.labels.provider || '?'} ${s.labels.operation || '?'}`,
      value: s.value,
      provider: s.labels.provider,
      operation: s.labels.operation,
    }))
  }, [parsed])

  const scaleEventsData = useMemo(() => {
    const samples = getSamples(parsed, 'cloudburst_scale_events_total')
    return samples.map((s) => ({
      name: `${s.labels.direction || '?'} (${s.labels.provider || '?'})`,
      value: s.value,
      direction: s.labels.direction,
      provider: s.labels.provider,
    }))
  }, [parsed])

  const phaseTransitionsData = useMemo(() => {
    const samples = getSamples(parsed, 'cloudburst_nodeclaim_phase_transitions_total')
    return samples.map((s) => ({
      name: `${s.labels.from_phase || '?'}→${s.labels.to_phase || '?'} (${s.labels.provider || '?'})`,
      value: s.value,
      from: s.labels.from_phase,
      to: s.labels.to_phase,
      provider: s.labels.provider,
    }))
  }, [parsed])

  const provisioningDurationData = useMemo(() => {
    const means = getHistogramMeans(parsed, 'cloudburst_provisioning_duration_seconds')
    return means.map((m) => ({
      name: m.provider || 'default',
      value: Math.round(m.mean),
      fullValue: m.mean,
      count: m.count,
    }))
  }, [parsed])

  const joiningDurationData = useMemo(() => {
    const means = getHistogramMeans(parsed, 'cloudburst_joining_duration_seconds')
    return means.map((m) => ({
      name: m.provider || 'default',
      value: Math.round(m.mean),
      fullValue: m.mean,
      count: m.count,
    }))
  }, [parsed])

  const drainDurationData = useMemo(() => {
    const counts = parsed.filter(
      (m) => m.name === 'cloudburst_drain_duration_seconds' && m.suffix === '_count'
    )
    const sums = parsed.filter(
      (m) => m.name === 'cloudburst_drain_duration_seconds' && m.suffix === '_sum'
    )
    if (counts.length === 0) return []
    const count = counts[0].value
    const sum = sums[0]?.value ?? 0
    return [
      {
        name: 'Drain',
        value: count > 0 ? Math.round(sum / count) : 0,
        fullValue: count > 0 ? sum / count : 0,
        count,
      },
    ]
  }, [parsed])

  const cloudbrokerLatencyData = useMemo(() => {
    const counts = parsed.filter(
      (m) =>
        m.name === 'cloudburst_cloudbroker_request_duration_seconds' &&
        m.suffix === '_count'
    )
    const sums = parsed.filter(
      (m) =>
        m.name === 'cloudburst_cloudbroker_request_duration_seconds' &&
        m.suffix === '_sum'
    )
    if (counts.length === 0) return []
    const count = counts[0].value
    const sum = sums[0]?.value ?? 0
    return [
      {
        name: 'CloudBroker',
        value: count > 0 ? Math.round((sum / count) * 1000) : 0,
        fullValue: count > 0 ? sum / count : 0,
        count,
      },
    ]
  }, [parsed])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filteredMetrics)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const ChartCard = ({
    title,
    description,
    children,
    dataLength,
    ariaLabel,
  }: {
    title: string
    description: string
    children: React.ReactNode
    dataLength: number
    ariaLabel?: string
  }) => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {description}
      </p>
      {dataLength > 0 ? (
        <div className="h-48" role="img" aria-label={ariaLabel ?? `${title}: ${description}`}>
          {children}
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center">
          <EmptyState title="No data yet" className="py-4" />
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <BarChart2 className="w-5 h-5" aria-hidden />
          Prometheus Metrics
        </h1>
        <FilterBar>
          <FilterField id="metrics-filter" label="Filter raw output">
            <FilterInput
              id="metrics-filter"
              type="search"
              placeholder="Filter raw output..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-40 sm:w-48"
            />
          </FilterField>
          <FilterActions>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={copied ? 'Copied' : 'Copy to clipboard'}
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
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

      {data?.pod && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Metrics from controller pod: <span className="font-mono">{data.pod}</span> (cloudburst-system)
        </p>
      )}

      {isLoading && <LoadingSkeleton variant="graph" />}
      {isError && (
        <ErrorAlert error={error ?? new Error('Failed to load')} title="Failed to load metrics" />
      )}
      {data?.error && !data.metrics && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <p className="font-medium">No metrics available</p>
          <p className="text-sm mt-1">{data.error}</p>
        </div>
      )}

      {!isLoading && !isError && data?.metrics && (
        <>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Scale & events
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard
                title="NodeClaims active"
                description="Current NodeClaims by provider and phase (gauge)"
                dataLength={nodeClaimsActiveData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {nodeClaimsActiveData.length > 0 && nodeClaimsActiveData.length <= 8 ? (
                    <PieChart>
                      <Pie
                        data={nodeClaimsActiveData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {nodeClaimsActiveData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'count']} />
                    </PieChart>
                  ) : (
                    <BarChart
                      data={nodeClaimsActiveData}
                      margin={{
                        top: 5,
                        right: 5,
                        left: 5,
                        bottom: nodeClaimsActiveData.length > 8 ? 50 : 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => truncateTick(v)}
                        interval={xAxisInterval(nodeClaimsActiveData.length)}
                        angle={nodeClaimsActiveData.length > 8 ? -35 : 0}
                        textAnchor={nodeClaimsActiveData.length > 8 ? 'end' : 'middle'}
                        height={nodeClaimsActiveData.length > 8 ? 50 : 30}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v, _n, props: { payload?: { name?: string } }) => [v, props.payload?.name ?? '']} />
                      <Bar dataKey="value" fill={COLORS[0]} name="count" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Provider errors"
                description="API errors by provider and operation (create, delete, status)"
                dataLength={providerErrorsData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={providerErrorsData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: providerErrorsData.length > 6 ? 55 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => truncateTick(v)}
                      interval={xAxisInterval(providerErrorsData.length)}
                      angle={providerErrorsData.length > 6 ? -35 : -15}
                      textAnchor="end"
                      height={providerErrorsData.length > 6 ? 55 : 50}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, _n, props: { payload?: { name?: string } }) => [v, props.payload?.name ?? '']} />
                    <Bar dataKey="value" fill="#ef4444" name="errors" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Scale events"
                description="Scale-up and scale-down events by provider"
                dataLength={scaleEventsData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scaleEventsData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: scaleEventsData.length > 6 ? 55 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => truncateTick(v)}
                      interval={xAxisInterval(scaleEventsData.length)}
                      angle={scaleEventsData.length > 6 ? -35 : -15}
                      textAnchor="end"
                      height={scaleEventsData.length > 6 ? 55 : 50}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, _n, props: { payload?: { name?: string } }) => [v, props.payload?.name ?? '']} />
                    <Bar dataKey="value" fill={COLORS[0]} name="events" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Phase transitions"
                description="NodeClaim phase transitions (e.g. Pending→Provisioning)"
                dataLength={phaseTransitionsData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={phaseTransitionsData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: phaseTransitionsData.length > 6 ? 60 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => truncateTick(v, 12)}
                      interval={xAxisInterval(phaseTransitionsData.length)}
                      angle={phaseTransitionsData.length > 6 ? -35 : -20}
                      textAnchor="end"
                      height={phaseTransitionsData.length > 6 ? 60 : 50}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v, _n, props: { payload?: { name?: string } }) => [v, props.payload?.name ?? '']} />
                    <Bar dataKey="value" fill={COLORS[2]} name="transitions" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Latency & duration
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard
                title="Provisioning duration (avg seconds)"
                description="Time from Pending to Joining (instance running)"
                dataLength={provisioningDurationData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={provisioningDurationData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: provisioningDurationData.length > 6 ? 50 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => truncateTick(v)}
                      interval={xAxisInterval(provisioningDurationData.length)}
                      angle={provisioningDurationData.length > 6 ? -35 : 0}
                      textAnchor={provisioningDurationData.length > 6 ? 'end' : 'middle'}
                      height={provisioningDurationData.length > 6 ? 50 : 30}
                    />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: 'seconds', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(_, __, props: { payload?: { fullValue?: number; count?: number; name?: string } }) => props.payload ? [`${(props.payload.fullValue ?? 0).toFixed(1)}s (n=${props.payload.count ?? 0})`, props.payload.name] : ''} />
                    <Bar dataKey="value" fill={COLORS[1]} name="avg seconds" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Joining duration (avg seconds)"
                description="Time from Joining to Ready (node ready)"
                dataLength={joiningDurationData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={joiningDurationData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: joiningDurationData.length > 6 ? 50 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => truncateTick(v)}
                      interval={xAxisInterval(joiningDurationData.length)}
                      angle={joiningDurationData.length > 6 ? -35 : 0}
                      textAnchor={joiningDurationData.length > 6 ? 'end' : 'middle'}
                      height={joiningDurationData.length > 6 ? 50 : 30}
                    />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: 'seconds', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(_, __, props: { payload?: { fullValue?: number; count?: number; name?: string } }) => props.payload ? [`${(props.payload.fullValue ?? 0).toFixed(1)}s (n=${props.payload.count ?? 0})`, props.payload.name] : ''} />
                    <Bar dataKey="value" fill={COLORS[4]} name="avg seconds" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Drain duration (avg seconds)"
                description="Time to drain a node before deletion"
                dataLength={drainDurationData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={drainDurationData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: drainDurationData.length > 6 ? 50 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => truncateTick(v)}
                      interval={xAxisInterval(drainDurationData.length)}
                      angle={drainDurationData.length > 6 ? -35 : 0}
                      textAnchor={drainDurationData.length > 6 ? 'end' : 'middle'}
                      height={drainDurationData.length > 6 ? 50 : 30}
                    />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: 'seconds', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(_, __, props: { payload?: { fullValue?: number; count?: number; name?: string } }) => props.payload ? [`${(props.payload.fullValue ?? 0).toFixed(1)}s (n=${props.payload.count ?? 0})`, props.payload.name] : ''} />
                    <Bar dataKey="value" fill={COLORS[3]} name="avg seconds" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="CloudBroker latency (avg ms)"
                description="Recommendation API request duration"
                dataLength={cloudbrokerLatencyData.length}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cloudbrokerLatencyData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: cloudbrokerLatencyData.length > 6 ? 50 : 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => truncateTick(v)}
                      interval={xAxisInterval(cloudbrokerLatencyData.length)}
                      angle={cloudbrokerLatencyData.length > 6 ? -35 : 0}
                      textAnchor={cloudbrokerLatencyData.length > 6 ? 'end' : 'middle'}
                      height={cloudbrokerLatencyData.length > 6 ? 50 : 30}
                    />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(_, __, props: { payload?: { fullValue?: number; count?: number; name?: string } }) => props.payload ? [`${Math.round((props.payload.fullValue ?? 0) * 1000)}ms (n=${props.payload.count ?? 0})`, props.payload.name] : ''} />
                    <Bar dataKey="value" fill={COLORS[5]} name="avg ms" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>

          <section>
            <button
              type="button"
              onClick={() => setRawOutputExpanded((e) => !e)}
              className="flex items-center gap-2 w-full text-left text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
              aria-expanded={rawOutputExpanded}
            >
              {rawOutputExpanded ? (
                <ChevronDown className="w-4 h-4" aria-hidden />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden />
              )}
              Raw Prometheus output
              {cloudburstMetrics.length > 0 && (
                <span className="text-xs font-normal normal-case">
                  ({cloudburstMetrics.length} cloudburst_* lines)
                </span>
              )}
            </button>
            {rawOutputExpanded && (
              <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-900 shadow-sm">
                {filter && (
                  <div className="px-4 py-2 bg-gray-800/80 text-gray-400 text-sm border-b border-gray-700">
                    Filtering by &quot;{filter}&quot; —{' '}
                    {filteredMetrics ? filteredMetrics.split('\n').filter(Boolean).length : 0} matching lines
                  </div>
                )}
                <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto overflow-y-auto max-h-[50vh] whitespace-pre-wrap break-words">
                  {filteredMetrics || (filter ? '(no matching lines)' : '(no metrics)')}
                </pre>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
