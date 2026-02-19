import {
  Layers,
  Clock,
  Play,
  AlertTriangle,
  Cpu,
  Package,
  Server,
  GitBranch,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDashboard, usePods, useNodeClaims } from '../api/hooks'
import { StatCard } from '../components/StatCard'
import { LifecycleLegend } from '../components/LifecycleLegend'

export function OverviewPage() {
  const { data: stats, isLoading, isError, error } = useDashboard()
  const { data: pods } = usePods()
  const { data: claims } = useNodeClaims()

  const allUnschedulable = (pods ?? []).filter((p) => p.unschedulable)
  const allFailedClaims = (claims ?? []).filter((c) => c.phase === 'Failed')
  const unschedulablePods = allUnschedulable.slice(0, 5)
  const failedClaims = allFailedClaims.slice(0, 5)

  const hasIssues = allUnschedulable.length > 0 || allFailedClaims.length > 0

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="space-y-1">
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        </div>
        <div className="space-y-6">
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-red-800 dark:text-red-200">
        Error: {error instanceof Error ? error.message : 'Failed to load'}
        <p className="text-sm mt-1">Is the UI server running? Try: make run-ui</p>
      </div>
    )
  }

  const phases = stats.nodeClaimsByPhase || {}
  const statusSummary = hasIssues
    ? [
        allUnschedulable.length > 0 && `${allUnschedulable.length} unschedulable pod${allUnschedulable.length !== 1 ? 's' : ''}`,
        allFailedClaims.length > 0 && `${allFailedClaims.length} failed claim${allFailedClaims.length !== 1 ? 's' : ''}`,
      ]
        .filter(Boolean)
        .join(', ')
    : 'All systems operating normally'

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Cluster Overview
        </h1>
        <p
          className={`text-sm ${
            hasIssues
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-green-700 dark:text-green-400'
          }`}
        >
          {statusSummary}
        </p>
      </header>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Workloads
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Pods"
            value={stats.totalPods}
            to="/pods"
            icon={Layers}
          />
          <StatCard
            title="Pending"
            value={stats.pendingPods}
            to="/pods?phase=Pending"
            icon={Clock}
            accent="info"
          />
          <StatCard
            title="Running"
            value={stats.runningPods}
            to="/pods?phase=Running"
            icon={Play}
            accent="success"
          />
          <StatCard
            title="Unschedulable"
            value={stats.unschedulablePods}
            to="/pods"
            icon={AlertTriangle}
            accent="warning"
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Infrastructure
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="NodeClaims"
            value={stats.totalNodeClaims}
            label={`${phases.Ready ?? 0} Ready, ${phases.Pending ?? 0} Pending, ${phases.Provisioning ?? 0} Provisioning`}
            to="/nodeclaims"
            icon={Cpu}
          />
          <StatCard
            title="Node Pools"
            value={stats.nodePoolCount}
            to="/nodepools"
            icon={Package}
          />
          <StatCard
            title="CloudBurst Nodes"
            value={stats.cloudburstNodes}
            label={`of ${stats.totalNodes} total`}
            to="/nodes"
            icon={Server}
          />
        </div>
      </section>

      <LifecycleLegend />

      {(unschedulablePods.length > 0 || failedClaims.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Attention needed
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {unschedulablePods.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-amber-500 p-4">
                <h3 className="font-semibold mb-2 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" aria-hidden />
                  Unschedulable Pods
                </h3>
                <ul className="space-y-2">
                  {unschedulablePods.map((p) => (
                    <li key={`${p.namespace}/${p.name}`}>
                      <Link
                        to={`/pods/${p.namespace}/${p.name}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {p.namespace}/{p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {allUnschedulable.length > 5 && (
                  <Link
                    to="/pods"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block"
                  >
                    View all ({allUnschedulable.length})
                  </Link>
                )}
              </div>
            )}
            {failedClaims.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-red-500 p-4">
                <h3 className="font-semibold mb-2 text-red-700 dark:text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" aria-hidden />
                  Failed Node Claims
                </h3>
                <ul className="space-y-2">
                  {failedClaims.map((c) => (
                    <li key={`${c.namespace}/${c.name}`}>
                      <Link
                        to={`/nodeclaims/${c.namespace}/${c.name}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {c.namespace}/{c.name}
                      </Link>
                      {c.lastError && (
                        <span
                          className="text-xs text-gray-500 dark:text-gray-400 block truncate max-w-full line-clamp-2"
                          title={c.lastError}
                        >
                          {c.lastError}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {allFailedClaims.length > 5 && (
                  <Link
                    to="/nodeclaims"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block"
                  >
                    View all ({allFailedClaims.length})
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <Link
        to="/graph"
        className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl border border-primary-200/50 dark:border-primary-700/30 hover:border-primary-300 dark:hover:border-primary-600 transition"
      >
        <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-500/20 dark:bg-primary-400/20 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Explore the resource graph
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visualize pods, nodes, and NodeClaims
            </p>
          </div>
        </div>
        <span className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition shrink-0">
          View Full Graph
        </span>
      </Link>
    </div>
  )
}
