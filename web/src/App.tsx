import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<OverviewPage />} />
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
      </Route>
    </Routes>
  )
}
