import { Link } from 'react-router-dom'
import { Server, Cpu, Layers, AlertCircle, CheckCircle } from 'lucide-react'
import { useClusters } from '../api/hooks'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function FleetOverviewPage() {
  const { data: clusters, isLoading, isError, error } = useClusters()

  if (isLoading) {
    return <LoadingSkeleton variant="page" />
  }

  if (isError || !clusters) {
    return (
      <ErrorAlert
        error={error ?? new Error('Failed to load clusters')}
        title="Failed to load clusters"
      />
    )
  }

  const totalNodes = clusters.reduce((s, c) => s + c.totalNodes, 0)
  const totalNodeClaims = clusters.reduce((s, c) => s + c.totalNodeClaims, 0)
  const totalPendingPods = clusters.reduce((s, c) => s + c.pendingPods, 0)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Fleet Overview
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} · {totalNodes} nodes ·{' '}
          {totalNodeClaims} NodeClaims · {totalPendingPods} pending pods
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters.map((c) => (
          <Link
            key={c.id}
            to={`/clusters/${c.id}/overview`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</h2>
              {c.reachable ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <span title="Unreachable">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Server className="w-4 h-4" />
                <span>{c.totalNodes} nodes</span>
                {c.cloudburstNodes > 0 && (
                  <span className="text-primary-600 dark:text-primary-400">
                    ({c.cloudburstNodes} CloudBurst)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Cpu className="w-4 h-4" />
                <span>{c.totalNodeClaims} NodeClaims</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 col-span-2">
                <Layers className="w-4 h-4" />
                <span>{c.pendingPods} pending pods</span>
              </div>
            </div>
            <span className="inline-block mt-4 text-sm text-primary-600 dark:text-primary-400 font-medium">
              View cluster →
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
