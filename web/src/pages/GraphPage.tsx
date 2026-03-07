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
import { useTheme } from '../theme/ThemeProvider'
import { useGraphData } from '../api/hooks'
import { ResourceNode } from '../components/graph/ResourceNode'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { EmptyState } from '../components/EmptyState'
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { NodeSummary, NodeClaimSummary, NodePoolSummary, PodSummary } from '../types/api'

const NODE_WIDTH = 400
const NODE_HEIGHT = 116 // fixed height for all nodes (matches node+CloudBurst case)
const COLUMN_GAP = 200 // horizontal gap between columns (min 200px)
const VERTICAL_GAP = 80 // vertical gap between nodes in same column (min 80px)
const BRANCH_GAP = 120 // extra spacing between different branch groups (same parent)

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
    namespace: p.namespace,
    name: p.name,
    key: p.namespace + '/' + p.name,
  }))
  const ncData = nodeclaims.map((nc) => ({
    id: toId('nc', nc.namespace + '/' + nc.name),
    namespace: nc.namespace,
    name: nc.name,
    nodeName: nc.nodeName,
    poolKey: nc.namespace + '/' + nc.nodePoolRef,
  }))
  const nodeData = nodes.map((n) => ({
    id: toId('n', n.name),
    name: n.name,
    cloudburstManaged: isCloudBurstNode(n),
  }))
  const podData = pods.map((p) => ({
    id: toId('p', p.namespace + '/' + p.name),
    namespace: p.namespace,
    name: p.name,
    nodeName: p.nodeName,
  }))

  npData.forEach(({ id, namespace, name }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { namespace, name, type: 'nodepool' },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
  ncData.forEach(({ id, namespace, name }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { namespace, name, type: 'nodeclaim' },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
  nodeData.forEach(({ id, name, cloudburstManaged }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { name, type: 'node', cloudburstManaged },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })
  podData.forEach(({ id, namespace, name }) => {
    nodesList.push({
      id,
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { namespace, name, type: 'pod' },
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
    const n = nodeData.find((x) => x.name === nc.nodeName)
    if (n) {
      edgesList.push({ id: `${nc.id}-${n.id}`, source: nc.id, target: n.id })
      ncToNode.set(nc.id, nc.nodeName)
    }
  })
  podData.forEach((p) => {
    if (!p.nodeName) return
    const n = nodeData.find((x) => x.name === p.nodeName)
    if (n) {
      edgesList.push({ id: `${n.id}-${p.id}`, source: n.id, target: p.id })
      const list = podsByNode.get(p.nodeName) ?? []
      list.push(p.id)
      podsByNode.set(p.nodeName, list)
    }
  })

  return { nodes: nodesList, edges: edgesList, podsByNode, ncToNode, npToNcs }
}

/** Sort key for alphabetical ordering (namespace/name or name) */
function sortKey(n: Node): string {
  const ns = (n.data?.namespace as string) ?? ''
  const name = String(n.data?.name ?? n.data?.label ?? n.id)
  return ns ? `${ns}/${name}` : name
}

/**
 * Build parent -> children order from edges (top-to-bottom = first to last in array).
 * Ensures child nodes are sorted in the same order as parent connections to avoid edge overlap.
 */
function buildSourceToTargets(edges: Edge[]): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const e of edges) {
    const list = m.get(e.source) ?? []
    list.push(e.target)
    m.set(e.source, list)
  }
  return m
}

/**
 * Column layout with strict left-to-right flow and no overlapping edges.
 *
 * Strategy (bottom-up centering):
 *  1. Build rows: each row = one NC + its linked Node + that Node's Pods.
 *     Rows within the same NP group are separated by VERTICAL_GAP;
 *     rows from different NP groups are separated by BRANCH_GAP.
 *  2. Row height = height needed by its Pod column (or NODE_HEIGHT when 0 pods).
 *  3. Within every row:
 *       • Pods stack from the TOP of the row with VERTICAL_GAP between them.
 *       • NC and Node are centered vertically inside the row so they align with
 *         the middle of their Pod group → no edge crossing.
 *  4. Each NodePool is centered on the vertical extent of all its NC rows.
 *
 * This guarantees:
 *  • Same X per column (strict column alignment).
 *  • Children centered relative to their parent.
 *  • Edge order (top-to-bottom) preserved → no overlapping edges.
 *  • At least VERTICAL_GAP between nodes in the same column.
 *  • At least COLUMN_GAP between columns.
 *  • Extra BRANCH_GAP between different NP groups.
 */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  podsByNode: Map<string, string[]>,
  npToNcs: Map<string, string[]>
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const COL_NP = 0
  const COL_NC = 1
  const COL_NODE = 2
  const COL_POD = 3

  const colX = (col: number) => col * (NODE_WIDTH + COLUMN_GAP)
  const sourceToTargets = buildSourceToTargets(edges)

  const byId = new Map<string, Node>()
  const byType: Record<string, Node[]> = { nodepool: [], nodeclaim: [], node: [], pod: [] }
  nodes.forEach((n) => {
    byId.set(n.id, n)
    const t = (n.data?.type as string) ?? 'pod'
    if (t in byType) byType[t].push(n)
    else byType.pod.push(n)
  })

  const ncToNp = new Map<string, string>()
  npToNcs.forEach((ncIds, npId) => {
    ncIds.forEach((ncId) => ncToNp.set(ncId, npId))
  })

  const positioned = new Map<string, { x: number; y: number }>()
  const setPos = (id: string, x: number, y: number) => positioned.set(id, { x, y })

  // ── Build ordered pod lists for each Node (edge order → no crossing) ──────
  const nodeToPodIds = new Map<string, string[]>()
  byType.node.forEach((n) => {
    const nodeName = String(n.data?.name ?? n.data?.label ?? '')
    const podIds = podsByNode.get(nodeName) ?? []
    const edgeOrder = sourceToTargets.get(n.id) ?? []
    const ordered =
      edgeOrder.length > 0
        ? edgeOrder.filter((id) => podIds.includes(id))
        : [...podIds].sort((a, b) => sortKey(byId.get(a)!).localeCompare(sortKey(byId.get(b)!)))
    nodeToPodIds.set(n.id, ordered)
  })

  // ── Build row list (NP edge order → no crossing between NP branches) ─────
  const sortedNPs = [...byType.nodepool].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  interface Row {
    ncId: string
    nodeId: string | null
    podIds: string[]
    npId: string
  }

  const rows: Row[] = []
  sortedNPs.forEach((np) => {
    const ncIds = sourceToTargets.get(np.id) ?? npToNcs.get(np.id) ?? []
    ncIds.forEach((ncId) => {
      const nodeIds = sourceToTargets.get(ncId) ?? []
      const nodeId = nodeIds[0] ?? null
      const podIds = nodeId ? (nodeToPodIds.get(nodeId) ?? []) : []
      rows.push({ ncId, nodeId, podIds, npId: np.id })
    })
  })

  // Orphan NCs (their NP wasn't in sortedNPs or they have no NP)
  const rowNcIds = new Set(rows.map((r) => r.ncId))
  const orphanNCs = byType.nodeclaim
    .filter((n) => !rowNcIds.has(n.id))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  orphanNCs.forEach((nc) => {
    const nodeIds = sourceToTargets.get(nc.id) ?? []
    const nodeId = nodeIds[0] ?? null
    const podIds = nodeId ? (nodeToPodIds.get(nodeId) ?? []) : []
    rows.push({ ncId: nc.id, nodeId, podIds, npId: ncToNp.get(nc.id) ?? '' })
  })

  // ── Row height = height of its Pod column (or NODE_HEIGHT when no pods) ───
  function calcRowHeight(row: Row): number {
    const k = row.podIds.length
    return k === 0 ? NODE_HEIGHT : k * NODE_HEIGHT + (k - 1) * VERTICAL_GAP
  }

  // ── Phase 1: assign rowTop for every row ─────────────────────────────────
  // Rows in the same NP group: VERTICAL_GAP between them.
  // Rows across NP groups: extra BRANCH_GAP.
  const rowTops = new Map<string, number>()
  const rowHeights = new Map<string, number>()
  let cursor = 0
  let lastNpId = ''

  rows.forEach((row) => {
    if (lastNpId !== '' && row.npId !== lastNpId) cursor += BRANCH_GAP
    lastNpId = row.npId
    rowTops.set(row.ncId, cursor)
    const rh = calcRowHeight(row)
    rowHeights.set(row.ncId, rh)
    cursor += rh + VERTICAL_GAP
  })

  const totalContentHeight = Math.max(0, cursor - VERTICAL_GAP)

  // ── Phase 2: place NC, Node, Pods within each row ─────────────────────────
  // • Pods: stacked from row-top, VERTICAL_GAP between each.
  // • NC & Node: vertically centered inside the row (aligns with pod group center).
  rows.forEach((row) => {
    const top = rowTops.get(row.ncId)!
    const rh = rowHeights.get(row.ncId)!
    // Center of the row → NC/Node sit in the middle of their pod group.
    const centeredY = top + (rh - NODE_HEIGHT) / 2

    setPos(row.ncId, colX(COL_NC), centeredY)
    if (row.nodeId) setPos(row.nodeId, colX(COL_NODE), centeredY)

    row.podIds.forEach((podId, j) => {
      setPos(podId, colX(COL_POD), top + j * (NODE_HEIGHT + VERTICAL_GAP))
    })
  })

  // ── Phase 3: place each NodePool centered on its NC group ─────────────────
  // NPs without NCs are stacked after all other content.
  const orphanNPs: Node[] = []
  sortedNPs.forEach((np) => {
    const ncIds = sourceToTargets.get(np.id) ?? npToNcs.get(np.id) ?? []
    if (ncIds.length === 0) {
      orphanNPs.push(np)
      return
    }
    const firstTop = rowTops.get(ncIds[0]) ?? 0
    const lastId = ncIds[ncIds.length - 1]
    const lastTop = rowTops.get(lastId) ?? 0
    const lastRh = rowHeights.get(lastId) ?? NODE_HEIGHT
    const groupCenter = (firstTop + lastTop + lastRh) / 2
    setPos(np.id, colX(COL_NP), groupCenter - NODE_HEIGHT / 2)
  })
  orphanNPs.forEach((np, i) => {
    setPos(np.id, colX(COL_NP), totalContentHeight + BRANCH_GAP + i * (NODE_HEIGHT + VERTICAL_GAP))
  })

  // ── Unplaced nodes and their pods – laid out as pseudo-rows ─────────────
  // Nodes without a NodeClaim path are grouped with their own pods so that
  // the node is vertically centered on its pod group, matching the logic used
  // for placed rows. This prevents nodes and pods from ending up at
  // mismatched Y positions when no NodeClaim connects them.
  const placedPods = new Set<string>()
  rows.forEach((r) => r.podIds.forEach((id) => placedPods.add(id)))

  const placedNodes = new Set(rows.filter((r) => r.nodeId).map((r) => r.nodeId!))
  const unplacedNodes = byType.node
    .filter((n) => !placedNodes.has(n.id))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  // Start unplaced section below all placed content, with extra spacing when
  // there is placed content above.
  let unplacedCursor = totalContentHeight > 0 ? totalContentHeight + BRANCH_GAP : 0

  unplacedNodes.forEach((n) => {
    const podIds = nodeToPodIds.get(n.id) ?? []
    const k = podIds.length
    const rowH = k === 0 ? NODE_HEIGHT : k * NODE_HEIGHT + (k - 1) * VERTICAL_GAP
    // Center the node vertically within its pod group (same as placed rows).
    const centeredY = unplacedCursor + (rowH - NODE_HEIGHT) / 2
    setPos(n.id, colX(COL_NODE), centeredY)
    podIds.forEach((podId, j) => {
      setPos(podId, colX(COL_POD), unplacedCursor + j * (NODE_HEIGHT + VERTICAL_GAP))
      placedPods.add(podId)
    })
    unplacedCursor += rowH + VERTICAL_GAP
  })

  // Pods with no node present in the graph at all – place them after everything else.
  const unplacedFreePods = byType.pod
    .filter((p) => !placedPods.has(p.id))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  unplacedFreePods.forEach((p, i) => {
    setPos(p.id, colX(COL_POD), unplacedCursor + i * (NODE_HEIGHT + VERTICAL_GAP))
  })

  const layoutedNodes = nodes.map((n): Node => {
    const pos = positioned.get(n.id) ?? { x: colX(0), y: 0 }
    return {
      ...n,
      position: { x: pos.x, y: pos.y },
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
  const { theme } = useTheme()
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
    const { nodes: rawNodes, edges: rawEdges, podsByNode, npToNcs } = buildGraphData(p, nc, np, n)
    return getLayoutedElements(rawNodes, rawEdges, podsByNode, npToNcs)
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
            className={theme === 'dark' ? 'dark' : ''}
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
