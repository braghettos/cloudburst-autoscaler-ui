import { Link } from 'react-router-dom'
import { useDashboard, usePods, useNodeClaims } from '../api/hooks'
import { StatCard } from '../components/StatCard'
import { LifecycleLegend } from '../components/LifecycleLegend'

export function OverviewPage() {
  const { data: stats, isLoading, isError, error } = useDashboard()
  const { data: pods } = usePods()
  const { data: claims } = useNodeClaims()

  const unschedulablePods = (pods ?? []).filter((p) => p.unschedulable).slice(0, 5)
  const failedClaims = (claims ?? []).filter((c) => c.phase === 'Failed').slice(0, 5)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-red-800 dark:text-red-200">
        Error: {error instanceof Error ? error.message : 'Failed to load'}
        <p className="text-sm mt-1">Is the UI server running? Try: make run-ui</p>
      </div>
    )
  }

  const phases = stats.nodeClaimsByPhase || {}

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Cluster Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard title="Total Pods" value={stats.totalPods} to="/pods" />
        <StatCard title="Pending" value={stats.pendingPods} to="/pods?phase=Pending" />
        <StatCard title="Running" value={stats.runningPods} to="/pods?phase=Running" />
        <StatCard
          title="Unschedulable"
          value={stats.unschedulablePods}
          to="/pods"
        />
        <StatCard
          title="NodeClaims"
          value={stats.totalNodeClaims}
          label={`${phases.Ready ?? 0} Ready, ${phases.Pending ?? 0} Pending, ${phases.Provisioning ?? 0} Provisioning`}
          to="/nodeclaims"
        />
        <StatCard title="Node Pools" value={stats.nodePoolCount} to="/nodepools" />
        <StatCard
          title="CloudBurst Nodes"
          value={stats.cloudburstNodes}
          label={`of ${stats.totalNodes} total`}
          to="/nodes"
        />
      </div>
      <LifecycleLegend />
      {(unschedulablePods.length > 0 || failedClaims.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {unschedulablePods.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2 text-amber-700 dark:text-amber-400">
                Unschedulable Pods
              </h3>
              <ul className="space-y-1">
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
            </div>
          )}
          {failedClaims.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2 text-red-700 dark:text-red-400">
                Failed Node Claims
              </h3>
              <ul className="space-y-1">
                {failedClaims.map((c) => (
                  <li key={`${c.namespace}/${c.name}`}>
                    <Link
                      to={`/nodeclaims/${c.namespace}/${c.name}`}
                      className="text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {c.namespace}/{c.name}
                    </Link>
                    {c.lastError && (
                      <span className="text-xs text-gray-500 block truncate">{c.lastError}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-center">
        <Link
          to="/graph"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
        >
          View Full Graph
        </Link>
      </div>
    </div>
  )
}
