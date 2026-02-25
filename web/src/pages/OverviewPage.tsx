import { useEffect, useState } from 'react'
import {
  Layers,
  Clock,
  Play,
  AlertTriangle,
  Cpu,
  Package,
  Server,
  GitBranch,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCluster } from '../contexts/ClusterContext'
import { clusterPath } from '../utils/routes'
import { useDashboard, usePods, useNodeClaims } from '../api/hooks'
import { StatCard } from '../components/StatCard'
import { PhaseBar } from '../components/PhaseBar'
import { ErrorAlert } from '../components/ErrorAlert'

export function OverviewPage() {
  const { clusterId, apiClusterId } = useCluster()
  const { data: stats, isLoading, isError, error, refetch, dataUpdatedAt } = useDashboard(apiClusterId)
  const { data: pods, isError: podsError, error: podsErrorObj, refetch: refetchPods } = usePods({ clusterId: apiClusterId })
  const { data: claims, isError: claimsError, error: claimsErrorObj, refetch: refetchClaims } = useNodeClaims({ clusterId: apiClusterId })

  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const allUnschedulable = (pods ?? []).filter((p) => p.unschedulable)
  const allFailedClaims = (claims ?? []).filter((c) => c.phase === 'Failed')
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <ErrorAlert
        error={error ?? new Error('Failed to load')}
        variant="cluster"
        hint={`Ensure ${clusterId ?? 'the cluster'} exists in your kubeconfig. Set KUBECONFIG and restart the UI server (./bin/cloudburst-ui).`}
        onRetry={() => refetch()}
      />
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

  const healthVariant = allFailedClaims.length > 0 ? 'error' : hasIssues ? 'warning' : 'ok'
  const isEmpty = stats.totalPods === 0 && stats.totalNodeClaims === 0

  const updatedAgo =
    dataUpdatedAt != null
      ? (() => {
          const s = Math.floor((Date.now() - dataUpdatedAt) / 1000)
          if (s < 60) return `${s}s ago`
          if (s < 3600) return `${Math.floor(s / 60)}m ago`
          return `${Math.floor(s / 3600)}h ago`
        })()
      : null

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Cluster Overview
          </h1>
          {updatedAgo != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              Updated {updatedAgo}
            </span>
          )}
        </div>
        <div
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border ${
            healthVariant === 'ok'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : healthVariant === 'warning'
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                healthVariant === 'ok'
                  ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                  : healthVariant === 'warning'
                    ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                    : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100'
              }`}
            >
              {healthVariant === 'ok' ? (
                <CheckCircle2 className="w-4 h-4" aria-hidden />
              ) : (
                <AlertTriangle className="w-4 h-4" aria-hidden />
              )}
              {healthVariant === 'ok' ? 'OK' : healthVariant === 'warning' ? 'Attention' : 'Error'}
            </span>
            <span
              className={`text-sm font-medium ${
                healthVariant === 'ok'
                  ? 'text-green-900 dark:text-green-100'
                  : healthVariant === 'warning'
                    ? 'text-amber-900 dark:text-amber-100'
                    : 'text-red-900 dark:text-red-100'
              }`}
            >
              {statusSummary}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {allUnschedulable.length > 0 && (
              <Link
                to={clusterPath(clusterId, '/pods')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-sm font-medium hover:bg-amber-300 dark:hover:bg-amber-700 transition"
              >
                View unschedulable pods
              </Link>
            )}
            {allFailedClaims.length > 0 && (
              <Link
                to={clusterPath(clusterId, '/nodeclaims')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 text-sm font-medium hover:bg-red-300 dark:hover:bg-red-700 transition"
              >
                View failed claims
              </Link>
            )}
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {isEmpty && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center shadow-sm">
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
            No workloads yet.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Pending pods will trigger NodeClaim creation. Create a NodePool and deploy workloads to see autoscaling in action.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to={clusterPath(clusterId, '/pods')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition"
            >
              <Layers className="w-4 h-4" />
              View Pods
            </Link>
            <Link
              to={clusterPath(clusterId, '/nodepools')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 text-sm font-medium text-gray-700 dark:text-gray-200 transition"
            >
              <Package className="w-4 h-4" />
              Node Pools
            </Link>
            <Link
              to={clusterPath(clusterId, '/graph')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 text-sm font-medium text-gray-700 dark:text-gray-200 transition"
            >
              <GitBranch className="w-4 h-4" />
              Resource Graph
            </Link>
          </div>
        </div>
      )}

      {stats && (podsError || claimsError) && (
        <div className="flex flex-wrap gap-3">
          {podsError && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-sm shadow-sm">
              <span>Unable to load pod details. {(podsErrorObj as Error)?.message}</span>
              <button
                type="button"
                onClick={() => refetchPods()}
                className="px-2 py-1 text-xs font-medium bg-amber-200 dark:bg-amber-800 rounded hover:bg-amber-300 dark:hover:bg-amber-700"
              >
                Retry
              </button>
            </div>
          )}
          {claimsError && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 text-sm shadow-sm">
              <span>Unable to load NodeClaim details. {(claimsErrorObj as Error)?.message}</span>
              <button
                type="button"
                onClick={() => refetchClaims()}
                className="px-2 py-1 text-xs font-medium bg-amber-200 dark:bg-amber-800 rounded hover:bg-amber-300 dark:hover:bg-amber-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {!isEmpty && (
        <>
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Pods"
            value={stats.totalPods}
            to={clusterId ? clusterPath(clusterId, '/pods') : undefined}
            icon={Layers}
          />
          <StatCard
            title="NodeClaims"
            value={stats.totalNodeClaims}
            label={<PhaseBar phases={phases} total={stats.totalNodeClaims} />}
            to={clusterId ? clusterPath(clusterId, '/nodeclaims') : undefined}
            icon={Cpu}
          />
          <StatCard
            title="CloudBurst Nodes"
            value={stats.cloudburstNodes}
            label={`of ${stats.totalNodes} total`}
            to={clusterId ? clusterPath(clusterId, '/nodes') : undefined}
            icon={Server}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          Workloads
        </h2>
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <Link
            to={clusterId ? clusterPath(clusterId, '/pods?phase=Pending') : '#'}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition ${
              stats.pendingPods > 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 ring-1 ring-blue-200 dark:ring-blue-800'
                : ''
            }`}
          >
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-700 dark:text-gray-200">Pending</span>
            <span className={`font-semibold ${stats.pendingPods > 0 ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
              {stats.pendingPods}
            </span>
          </Link>
          <Link
            to={clusterId ? clusterPath(clusterId, '/pods?phase=Running') : '#'}
            className="flex items-center gap-2 text-sm"
          >
            <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-gray-700 dark:text-gray-200">Running</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.runningPods}</span>
          </Link>
          <Link
            to={clusterId ? clusterPath(clusterId, '/pods') : '#'}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition ${
              stats.unschedulablePods > 0
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 ring-1 ring-amber-200 dark:ring-amber-800'
                : ''
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-gray-700 dark:text-gray-200">Unschedulable</span>
            <span className={`font-semibold ${stats.unschedulablePods > 0 ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-gray-100'}`}>
              {stats.unschedulablePods}
            </span>
          </Link>
          <Link
            to={clusterId ? clusterPath(clusterId, '/nodepools') : '#'}
            className="flex items-center gap-2 text-sm"
          >
            <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-200">Node Pools</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.nodePoolCount}</span>
          </Link>
        </div>
      </section>

      <Link
        to={clusterPath(clusterId, '/graph')}
        className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl border border-primary-200/50 dark:border-primary-700/30 hover:border-primary-300 dark:hover:border-primary-600 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
        </>
      )}

    </div>
  )
}
