import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useGraphData } from '../api/hooks'

function mermaidId(s: string) {
  return 'id' + String(s).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
}

function buildGraph(
  pods: { namespace: string; name: string; nodeName?: string }[],
  nodeclaims: { name: string; nodeName?: string; namespace: string; nodePoolRef: string }[],
  nodepools: { namespace: string; name: string }[],
  nodes: { name: string }[]
): string {
  const lines = ['flowchart TB']
  const esc = (s: string) => String(s || '').replace(/[[\]"\n]/g, "'")
  const npIds = nodepools.map((p) => ({
    id: mermaidId('np_' + p.namespace + p.name),
    label: p.namespace + '/' + p.name,
    key: p.namespace + '/' + p.name,
  }))
  const ncIds = nodeclaims.map((nc) => ({
    id: mermaidId('nc_' + nc.name),
    label: nc.name,
    nodeName: nc.nodeName,
    poolKey: nc.namespace + '/' + nc.nodePoolRef,
  }))
  const nodeIds = nodes.map((n) => ({ id: mermaidId('n_' + n.name), label: n.name }))
  const podIds = pods.map((p) => ({
    id: mermaidId('p_' + p.namespace + p.name),
    label: p.namespace + '/' + p.name,
    nodeName: p.nodeName,
  }))
  lines.push('  subgraph nodepools[Node Pools]')
  npIds.forEach(({ id, label }) => lines.push('    ' + id + '["' + esc(label) + '"]'))
  lines.push('  end')
  lines.push('  subgraph nodeclaims[Node Claims]')
  ncIds.forEach(({ id, label }) => lines.push('    ' + id + '["' + esc(label) + '"]'))
  lines.push('  end')
  lines.push('  subgraph nodes[Nodes]')
  nodeIds.forEach(({ id, label }) => lines.push('    ' + id + '["' + esc(label) + '"]'))
  lines.push('  end')
  lines.push('  subgraph pods[Pods]')
  podIds.forEach(({ id, label }) => lines.push('    ' + id + '["' + esc(label) + '"]'))
  lines.push('  end')
  ncIds.forEach((nc) => {
    const pool = npIds.find((p) => p.key === nc.poolKey)
    if (pool) lines.push('  ' + nc.id + ' --> ' + pool.id)
  })
  ncIds.forEach((nc) => {
    if (!nc.nodeName) return
    const node = nodeIds.find((n) => n.label === nc.nodeName)
    if (node) lines.push('  ' + nc.id + ' <--> ' + node.id)
  })
  podIds.forEach((p) => {
    if (!p.nodeName) return
    const node = nodeIds.find((n) => n.label === p.nodeName)
    if (node) lines.push('  ' + p.id + ' --> ' + node.id)
  })
  return lines.join('\n')
}

export function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { pods, nodeclaims, nodepools, nodes, isLoading, isError, error: fetchError } = useGraphData()

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#cfe2ff',
        primaryTextColor: '#084298',
        primaryBorderColor: '#084298',
        lineColor: '#666',
        secondaryColor: '#d1e7dd',
        tertiaryColor: '#f8f9fa',
      },
    })
  }, [])

  useEffect(() => {
    if (isLoading || isError || (!pods.length && !nodeclaims.length && !nodepools.length && !nodes.length)) return
    if (!containerRef.current) return

    const chart = buildGraph(pods, nodeclaims, nodepools, nodes)
    const id = 'mermaid-graph-' + Date.now()
    setError(null)
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg
      })
      .catch((err) => setError(err.message))
  }, [pods, nodeclaims, nodepools, nodes, isLoading, isError])

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded" />
  }
  if (isError || fetchError) {
    return (
      <div className="text-red-600 dark:text-red-400">
        {fetchError instanceof Error ? fetchError.message : 'Failed to load'}
      </div>
    )
  }
  if (!pods.length && !nodeclaims.length && !nodepools.length && !nodes.length) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">No resources to display</div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Resource Graph: Pods — Nodes — NodeClaims — NodePools</h2>
      <div
        ref={containerRef}
        className="min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-auto"
      />
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">Graph error: {error}</div>
      )}
    </div>
  )
}
