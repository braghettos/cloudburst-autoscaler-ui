const API_BASE = ''

async function fetchJSON<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v)
    })
  }
  const res = await fetch(API_BASE + url.pathname + url.search)
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const body = await res.text()
      if (body) {
        try {
          const parsed = JSON.parse(body) as { error?: string; message?: string }
          const bodyMsg = parsed.error || parsed.message
          if (bodyMsg) msg = `${res.status} ${bodyMsg}`
        } catch {
          if (body.length < 200) msg = body
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

function apiPath(clusterId: string | undefined, base: string, suffix = ''): string {
  if (!clusterId) {
    throw new Error('clusterId required for cluster-scoped API')
  }
  return `/api/clusters/${clusterId}${base}${suffix}`
}

export const api = {
  clusters: () => fetchJSON<import('../types/api').ClusterInfo[]>('/api/clusters'),

  dashboard: (clusterId?: string) =>
    fetchJSON<import('../types/api').DashboardStats>(apiPath(clusterId, '/dashboard')),

  pods: (params?: { clusterId?: string; namespace?: string; phase?: string }) => {
    const searchParams: Record<string, string> = {}
    if (params?.namespace) searchParams.namespace = params.namespace
    if (params?.phase) searchParams.phase = params.phase
    return fetchJSON<import('../types/api').PodSummary[]>(
      apiPath(params?.clusterId, '/pods'),
      Object.keys(searchParams).length ? searchParams : undefined
    )
  },
  pod: (clusterId: string | undefined, namespace: string, name: string) =>
    fetchJSON<import('../types/api').PodSummary>(apiPath(clusterId, '/pods', `/${namespace}/${name}`)),

  nodeclaims: (params?: { clusterId?: string; namespace?: string; phase?: string }) => {
    const searchParams: Record<string, string> = {}
    if (params?.namespace) searchParams.namespace = params.namespace
    if (params?.phase) searchParams.phase = params.phase
    return fetchJSON<import('../types/api').NodeClaimSummary[]>(
      apiPath(params?.clusterId, '/nodeclaims'),
      Object.keys(searchParams).length ? searchParams : undefined
    )
  },
  nodeclaim: (clusterId: string | undefined, namespace: string, name: string) =>
    fetchJSON<import('../types/api').NodeClaimSummary>(
      apiPath(clusterId, '/nodeclaims', `/${namespace}/${name}`)
    ),

  nodepools: (params?: { clusterId?: string; namespace?: string }) => {
    const searchParams: Record<string, string> = {}
    if (params?.namespace) searchParams.namespace = params.namespace
    return fetchJSON<import('../types/api').NodePoolSummary[]>(
      apiPath(params?.clusterId, '/nodepools'),
      Object.keys(searchParams).length ? searchParams : undefined
    )
  },
  nodepool: (clusterId: string | undefined, namespace: string, name: string) =>
    fetchJSON<import('../types/api').NodePoolSummary>(
      apiPath(clusterId, '/nodepools', `/${namespace}/${name}`)
    ),

  nodes: (clusterId?: string) =>
    fetchJSON<import('../types/api').NodeSummary[]>(apiPath(clusterId, '/nodes')),
  node: (clusterId: string | undefined, name: string) =>
    fetchJSON<import('../types/api').NodeSummary>(apiPath(clusterId, '/nodes', `/${name}`)),

  graph: (clusterId?: string) =>
    fetchJSON<{
      pods: import('../types/api').PodSummary[]
      nodeclaims: import('../types/api').NodeClaimSummary[]
      nodepools: import('../types/api').NodePoolSummary[]
      nodes: import('../types/api').NodeSummary[]
    }>(apiPath(clusterId, '/graph')),

  controllerLogs: (params?: { clusterId?: string; tail?: number }) => {
    const base = apiPath(params?.clusterId, '/logs/controller')
    const search = params?.tail ? `?tail=${params.tail}` : ''
    return fetchJSON<{ logs: string; pod?: string; error?: string }>(base + search)
  },
}
