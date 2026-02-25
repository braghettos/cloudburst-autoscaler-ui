import { useMemo, useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  Position,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Package, Cpu, Server, Layers, Maximize2, Filter } from 'lucide-react'
import { useCluster } from '../contexts/ClusterContext'
import { useGraphData } from '../api/hooks'
import { ResourceNode } from '../components/graph/ResourceNode'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { NodeSummary, NodeClaimSummary, NodePoolSummary, PodSummary } from '../types/api'

const NODE_WIDTH = 200
const NODE_HEIGHT = 56
const COLUMN_GAP = 120
const GROUP_GAP = 40
const POD_GAP = 12
const NC_GAP = 10 // vertical gap between NodeClaims sharing the same node (avoids edge overlap)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = { resource: ResourceNode }

function toId(prefix: string, s: string) {
  return prefix + '_' + String(s).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
}

function isCloudBurstNode(n: NodeSummary): boolean {
  return n.cloudburstManaged === true || (n.name ?? '').startsWith('cb-')
}

function isCloudBurstNodeClaim(nc: NodeClaimSummary): boolean {
  return (nc.name ?? '').startsWith('cb-')
}

function filterCloudBurstOnly(
  pods: PodSummary[],
  nodeclaims: NodeClaimSummary[],
  nodepools: NodePoolSummary[],
  nodes: NodeSummary[]
): { pods: PodSummary[]; nodeclaims: NodeClaimSummary[]; nodepools: NodePoolSummary[]; nodes: NodeSummary[] } {
  const cloudburstNodeNames = new Set(nodes.filter(isCloudBurstNode).map((n) => n.name))
  const cloudburstNCs = nodeclaims.filter(isCloudBurstNodeClaim)
  const npKeysFromNCs = new Set(cloudburstNCs.map((nc) => nc.namespace + '/' + nc.nodePoolRef))

  // NodePools: include those referenced by CloudBurst NodeClaims (cb-*) or by NodeClaims with joined CB nodes
  const npKeysFromCbNodes = new Set(
    nodeclaims
      .filter((nc) => nc.nodeName && cloudburstNodeNames.has(nc.nodeName))
      .map((nc) => nc.namespace + '/' + nc.nodePoolRef)
  )
  const allNpKeys = new Set([...npKeysFromNCs, ...npKeysFromCbNodes])
  const filteredNPs = nodepools.filter((np) => allNpKeys.has(np.namespace + '/' + np.name))

  // NodeClaims: include cb-* (CloudBurst naming) or those with joined CB nodes
  const filteredNCs = nodeclaims.filter(
    (nc) =>
      isCloudBurstNodeClaim(nc) ||
      (nc.nodeName != null && cloudburstNodeNames.has(nc.nodeName))
  )

  const filteredPods = pods.filter((p) => p.nodeName && cloudburstNodeNames.has(p.nodeName))
  const filteredNodes = nodes.filter(isCloudBurstNode)

  return {
    pods: filteredPods,
    nodeclaims: filteredNCs,
    nodepools: filteredNPs,
    nodes: filteredNodes,
  }
}

interface GraphResult {
  nodes: Node[]
  edges: Edge[]
  podsByNode: Map<string, string[]>
  ncToNode: Map<string, string>
  npToNcs: Map<string, string[]>
}

function buildGraphData(
  pods: PodSummary[],
  nodeclaims: NodeClaimSummary[],
  nodepools: NodePoolSummary[],
  nodes: NodeSummary[]
): GraphResult {
  const nodesList: Node[] = []
  const edgesList: Edge[] = []
  const podsByNode = new Map<string, string[]>()
  const ncToNode = new Map<string, string>()
  const npToNcs = new Map<string, string[]>()

  const npData = nodepools.map((p) => ({
    id: toId('np', p.namespace + '/' + p.name),
    label: `${p.namespace}/${p.name}`,
    key: p.namespace + '/' + p.name,
  }))
  const ncData = nodeclaims.map((nc) => ({
    id: toId('nc', nc.name),
    label: nc.name,
    nodeName: nc.nodeName,
    poolKey: nc.namespace + '/' + nc.nodePoolRef,
  }))
  const nodeData = nodes.map((n) => ({
    id: toId('n', n.name),
    label: n.name,
    cloudburstManaged: isCloudBurstNode(n),
  }))
  const podData = pods.map((p) => ({
    id: toId('p', p.namespace + '/' + p.name),
    label: `${p.namespace}/${p.name}`,
    nodeName: p.nodeName,
  }))

  npData.forEach(({ id, label }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { label, type: 'nodepool' },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
  ncData.forEach(({ id, label }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { label, type: 'nodeclaim' },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
  nodeData.forEach(({ id, label, cloudburstManaged }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { label, type: 'node', cloudburstManaged },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
  podData.forEach(({ id, label }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { label, type: 'pod' },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })

  // Edges: NP -> NC -> Node -> Pod
  ncData.forEach((nc) => {
    const pool = npData.find((p) => p.key === nc.poolKey)
    if (pool) {
      edgesList.push({ id: `${pool.id}-${nc.id}`, source: pool.id, target: nc.id })
      const list = npToNcs.get(pool.id) ?? []
      list.push(nc.id)
      npToNcs.set(pool.id, list)
    }
  })
  ncData.forEach((nc) => {
    if (!nc.nodeName) return
    const n = nodeData.find((x) => x.label === nc.nodeName)
    if (n) {
      edgesList.push({ id: `${nc.id}-${n.id}`, source: nc.id, target: n.id })
      ncToNode.set(nc.id, nc.nodeName)
    }
  })
  podData.forEach((p) => {
    if (!p.nodeName) return
    const n = nodeData.find((x) => x.label === p.nodeName)
    if (n) {
      edgesList.push({ id: `${n.id}-${p.id}`, source: n.id, target: p.id })
      const list = podsByNode.get(p.nodeName) ?? []
      list.push(p.id)
      podsByNode.set(p.nodeName, list)
    }
  })

  return { nodes: nodesList, edges: edgesList, podsByNode, ncToNode, npToNcs }
}

/**
 * Relationship-aware column layout.
 * Pods are grouped next to their parent node so each node+pods forms a
 * horizontal swim-lane. NodeClaims align with their node, NodePools center
 * across their NodeClaims.
 */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  podsByNode: Map<string, string[]>,
  ncToNode: Map<string, string>,
  npToNcs: Map<string, string[]>
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const COL_NP = 0
  const COL_NC = 1
  const COL_NODE = 2
  const COL_POD = 3

  const colX = (col: number) => col * (NODE_WIDTH + COLUMN_GAP)

  const byId = new Map<string, Node>()
  const byType: Record<string, Node[]> = { nodepool: [], nodeclaim: [], node: [], pod: [] }
  nodes.forEach((n) => {
    byId.set(n.id, n)
    const t = (n.data?.type as string) ?? 'pod'
    if (t in byType) byType[t].push(n)
    else byType.pod.push(n)
  })

  const positioned = new Map<string, { x: number; y: number }>()
  let cursorY = 0

  const k8sNodes = byType.node
  const podNodeById = new Map<string, Node>()
  byType.pod.forEach((p) => podNodeById.set(p.id, p))
  const placedPods = new Set<string>()

  // Pre-compute NC count per node to reserve vertical space and avoid edge overlap
  const ncCountByNode = new Map<string, number>()
  byType.nodeclaim.forEach((nc) => {
    const linkedNodeName = ncToNode.get(nc.id)
    if (linkedNodeName) {
      ncCountByNode.set(linkedNodeName, (ncCountByNode.get(linkedNodeName) ?? 0) + 1)
    }
  })

  k8sNodes.forEach((kNode) => {
    const nodeName = String(kNode.data?.label ?? '')
    const podIds = podsByNode.get(nodeName) ?? []
    const groupPodCount = podIds.length
    const ncCount = ncCountByNode.get(nodeName) ?? 1
    const nodeSlotH = NODE_HEIGHT
    const podsSlotH = groupPodCount > 0 ? groupPodCount * NODE_HEIGHT + (groupPodCount - 1) * POD_GAP : NODE_HEIGHT
    const ncSlotH = ncCount * NODE_HEIGHT + (ncCount - 1) * NC_GAP
    const groupH = Math.max(nodeSlotH, podsSlotH, ncSlotH)

    positioned.set(kNode.id, {
      x: colX(COL_NODE),
      y: cursorY + (groupH - NODE_HEIGHT) / 2,
    })

    podIds.forEach((podId, i) => {
      positioned.set(podId, {
        x: colX(COL_POD),
        y: cursorY + i * (NODE_HEIGHT + POD_GAP),
      })
      placedPods.add(podId)
    })

    cursorY += groupH + GROUP_GAP
  })

  const unplacedPods = byType.pod.filter((p) => !placedPods.has(p.id))
  if (unplacedPods.length > 0) {
    unplacedPods.forEach((p) => {
      positioned.set(p.id, { x: colX(COL_POD), y: cursorY })
      cursorY += NODE_HEIGHT + POD_GAP
    })
    cursorY += GROUP_GAP - POD_GAP
  }

  const nodeYById = new Map<string, number>()
  k8sNodes.forEach((kNode) => {
    const pos = positioned.get(kNode.id)
    if (pos) nodeYById.set(String(kNode.data?.label ?? ''), pos.y)
  })

  // Stack NodeClaims that share the same node to avoid edge overlap
  const ncIndexByNode = new Map<string, number>()
  const placedNCs = new Set<string>()
  let ncOrphanY = cursorY
  byType.nodeclaim.forEach((nc) => {
    const linkedNodeName = ncToNode.get(nc.id)
    if (linkedNodeName && nodeYById.has(linkedNodeName)) {
      const nodeY = nodeYById.get(linkedNodeName)!
      const count = ncCountByNode.get(linkedNodeName) ?? 1
      const idx = ncIndexByNode.get(linkedNodeName) ?? 0
      ncIndexByNode.set(linkedNodeName, idx + 1)
      const ncSlotH = count * NODE_HEIGHT + (count - 1) * NC_GAP
      const stackTop = nodeY - (ncSlotH - NODE_HEIGHT) / 2
      const y = stackTop + idx * (NODE_HEIGHT + NC_GAP)
      positioned.set(nc.id, { x: colX(COL_NC), y })
      placedNCs.add(nc.id)
    }
  })
  byType.nodeclaim.forEach((nc) => {
    if (!placedNCs.has(nc.id)) {
      const lastNodeY = k8sNodes.length > 0 ? Math.max(...[...nodeYById.values()]) + NODE_HEIGHT + GROUP_GAP : 0
      const y = Math.max(ncOrphanY, lastNodeY)
      positioned.set(nc.id, { x: colX(COL_NC), y })
      ncOrphanY = y + NODE_HEIGHT + GROUP_GAP
    }
  })

  const ncYById = new Map<string, number>()
  byType.nodeclaim.forEach((nc) => {
    const pos = positioned.get(nc.id)
    if (pos) ncYById.set(nc.id, pos.y)
  })

  let npOrphanY = 0
  byType.nodepool.forEach((np) => {
    const ncIds = npToNcs.get(np.id) ?? []
    const linkedYs = ncIds.map((id) => ncYById.get(id)).filter((y): y is number => y !== undefined)
    if (linkedYs.length > 0) {
      const minY = Math.min(...linkedYs)
      const maxY = Math.max(...linkedYs)
      positioned.set(np.id, { x: colX(COL_NP), y: (minY + maxY) / 2 })
    } else {
      positioned.set(np.id, { x: colX(COL_NP), y: npOrphanY })
      npOrphanY += NODE_HEIGHT + GROUP_GAP
    }
  })

  const layoutedNodes = nodes.map((n): Node => {
    const pos = positioned.get(n.id) ?? { x: 0, y: 0 }
    return {
      ...n,
      position: pos,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    }
  })

  return { nodes: layoutedNodes, edges }
}

function FitViewButton() {
  const { fitView } = useReactFlow()
  const handleClick = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 })
  }, [fitView])
  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/90 dark:bg-gray-800/90 shadow text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      title="Fit to view"
    >
      <Maximize2 className="w-3.5 h-3.5" />
      Fit
    </button>
  )
}

function FitViewOnFilterChange({ cloudburstOnly }: { cloudburstOnly: boolean }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const id = setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 50)
    return () => clearTimeout(id)
  }, [cloudburstOnly, fitView])
  return null
}

export function GraphPage() {
  const { apiClusterId } = useCluster()
  const [cloudburstOnly, setCloudburstOnly] = useState(true)
  const { pods, nodeclaims, nodepools, nodes, isLoading, isError, error: fetchError } = useGraphData(apiClusterId)

  const filtered = useMemo(() => {
    if (cloudburstOnly) {
      return filterCloudBurstOnly(pods, nodeclaims, nodepools, nodes)
    }
    return { pods, nodeclaims, nodepools, nodes }
  }, [cloudburstOnly, pods, nodeclaims, nodepools, nodes])

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const { pods: p, nodeclaims: nc, nodepools: np, nodes: n } = filtered
    if (!p.length && !nc.length && !np.length && !n.length) {
      return { nodes: [] as Node[], edges: [] as Edge[] }
    }
    const { nodes: rawNodes, edges: rawEdges, podsByNode, ncToNode, npToNcs } = buildGraphData(p, nc, np, n)
    return getLayoutedElements(rawNodes, rawEdges, podsByNode, ncToNode, npToNcs)
  }, [filtered])

  const hasCloudBurstResources = useMemo(() => {
    return nodes.some(isCloudBurstNode)
  }, [nodes])

  if (isLoading) {
    return <LoadingSkeleton variant="graph" />
  }
  if (isError || fetchError) {
    return <ErrorAlert error={fetchError ?? new Error('Failed to load')} title="Failed to load graph" />
  }

  const isEmpty = !filtered.pods.length && !filtered.nodeclaims.length && !filtered.nodepools.length && !filtered.nodes.length

  if (isEmpty && cloudburstOnly && !hasCloudBurstResources) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-lg font-semibold">Resource Graph</h1>
          <ToggleSwitch
            checked={cloudburstOnly}
            onChange={setCloudburstOnly}
            label="CloudBurst only"
          />
        </div>
        <EmptyState
          title="No CloudBurst resources yet."
          description="Create a NodePool and trigger a pending pod to see autoscaling. Ensure the UI is connected to the correct cluster (kubeconfig)."
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        />
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-lg font-semibold">Resource Graph</h1>
          <ToggleSwitch
            checked={cloudburstOnly}
            onChange={setCloudburstOnly}
            label="CloudBurst only"
          />
        </div>
        <EmptyState
          title="No resources to display."
          description="Create a NodePool and trigger a pending pod to see the autoscaling graph. Ensure the UI is connected to the correct cluster (kubeconfig)."
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        />
      </div>
    )
  }

  const stats = [
    { label: 'NodePools', value: filtered.nodepools.length, icon: Package },
    { label: 'NodeClaims', value: filtered.nodeclaims.length, icon: Cpu },
    { label: 'Nodes', value: filtered.nodes.length, icon: Server },
    { label: 'Pods', value: filtered.pods.length, icon: Layers },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold">Resource Graph</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <ToggleSwitch
              checked={cloudburstOnly}
              onChange={setCloudburstOnly}
              label="CloudBurst only"
            />
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {stats.map(({ label, value, icon: Icon }) => (
              <span key={label} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span className="font-medium">{value}</span>
                <span>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
          <Package className="w-3.5 h-3.5" />
          NodePool
        </span>
        <span className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
          <Cpu className="w-3.5 h-3.5" />
          NodeClaim
        </span>
        <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
          <Server className="w-3.5 h-3.5" />
          Node
        </span>
        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
          <Layers className="w-3.5 h-3.5" />
          Pod
        </span>
      </div>

      <div className="w-full min-h-[400px] h-[min(600px,70vh)] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-950 shadow-sm">
        <ReactFlowProvider>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => {
              requestAnimationFrame(() => instance?.fitView?.({ padding: 0.25 }))
            }}
          >
            <Background
              color="rgb(156 163 175)"
              className="bg-gray-50 dark:bg-gray-950"
              gap={16}
              size={1}
            />
            <Controls
              className="!bg-white/90 dark:!bg-gray-800/90 !border-gray-200 dark:!border-gray-700 !rounded-md"
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(node) => {
                const t = (node.data?.type as string) || 'pod'
                const colors: Record<string, string> = {
                  nodepool: '#3b82f6',
                  nodeclaim: '#22c55e',
                  node: '#a855f7',
                  pod: '#f59e0b',
                }
                return colors[t] ?? '#94a3b8'
              }}
              className="!bg-white/90 dark:!bg-gray-800/90 !rounded-md"
            />
            <FitViewOnFilterChange cloudburstOnly={cloudburstOnly} />
            <Panel position="top-left" className="flex gap-2">
              <div className="bg-white/95 dark:bg-gray-800/95 rounded-md px-2.5 py-1.5 shadow text-xs font-medium text-gray-600 dark:text-gray-300">
                NodePool → NodeClaim → Node → Pod
              </div>
              <FitViewButton />
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}
