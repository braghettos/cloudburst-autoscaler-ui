import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ClusterProvider } from './contexts/ClusterContext'
import { Layout } from './components/Layout'
import { FleetOverviewPage } from './pages/FleetOverviewPage'
import { OverviewPage } from './pages/OverviewPage'
import { PodsPage } from './pages/PodsPage'
import { PodDetailPage } from './pages/PodDetailPage'
import { NodeClaimsPage } from './pages/NodeClaimsPage'
import { NodeClaimDetailPage } from './pages/NodeClaimDetailPage'
import { NodePoolsPage } from './pages/NodePoolsPage'
import { NodePoolDetailPage } from './pages/NodePoolDetailPage'
import { NodesPage } from './pages/NodesPage'
import { NodeDetailPage } from './pages/NodeDetailPage'
import { GraphPage } from './pages/GraphPage'
import { LogsPage } from './pages/LogsPage'
import { MetricsPage } from './pages/MetricsPage'
import { EventsPage } from './pages/EventsPage'
import { useClusters } from './api/hooks'

function AppRoutes() {
  const { data: clusters = [], isLoading } = useClusters()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0d1117]">
        <div className="animate-pulse text-[#6c757d] dark:text-[#8b949e]">Loading clusters...</div>
      </div>
    )
  }

  const singleClusterId = clusters.length === 1 ? clusters[0].id : null

  return (
    <ClusterProvider clusters={clusters}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              singleClusterId ? (
                <Navigate to={`/clusters/${singleClusterId}/overview`} replace />
              ) : (
                <FleetOverviewPage />
              )
            }
          />
          <Route path="fleet" element={<FleetOverviewPage />} />
          <Route path="clusters/:clusterId" element={<Outlet />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="pods" element={<PodsPage />} />
            <Route path="pods/:namespace/:name" element={<PodDetailPage />} />
            <Route path="nodeclaims" element={<NodeClaimsPage />} />
            <Route path="nodeclaims/:namespace/:name" element={<NodeClaimDetailPage />} />
            <Route path="nodepools" element={<NodePoolsPage />} />
            <Route path="nodepools/:namespace/:name" element={<NodePoolDetailPage />} />
            <Route path="nodes" element={<NodesPage />} />
            <Route path="nodes/:name" element={<NodeDetailPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="events" element={<EventsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ClusterProvider>
  )
}

export default function App() {
  return <AppRoutes />
}
