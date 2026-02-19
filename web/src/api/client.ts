const API_BASE = ''

async function fetchJSON<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v)
    })
  }
  const res = await fetch(API_BASE + url.pathname + url.search)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export const api = {
  dashboard: () => fetchJSON<import('../types/api').DashboardStats>('/api/dashboard'),
  pods: (params?: { namespace?: string; phase?: string }) =>
    fetchJSON<import('../types/api').PodSummary[]>('/api/pods', params),
  pod: (namespace: string, name: string) =>
    fetchJSON<import('../types/api').PodSummary>(`/api/pods/${namespace}/${name}`),
  nodeclaims: (params?: { namespace?: string; phase?: string }) =>
    fetchJSON<import('../types/api').NodeClaimSummary[]>('/api/nodeclaims', params),
  nodeclaim: (namespace: string, name: string) =>
    fetchJSON<import('../types/api').NodeClaimSummary>(`/api/nodeclaims/${namespace}/${name}`),
  nodepools: (params?: { namespace?: string }) =>
    fetchJSON<import('../types/api').NodePoolSummary[]>('/api/nodepools', params),
  nodepool: (namespace: string, name: string) =>
    fetchJSON<import('../types/api').NodePoolSummary>(`/api/nodepools/${namespace}/${name}`),
  nodes: () => fetchJSON<import('../types/api').NodeSummary[]>('/api/nodes'),
  node: (name: string) => fetchJSON<import('../types/api').NodeSummary>(`/api/nodes/${name}`),
  graph: () =>
    fetchJSON<{
      pods: import('../types/api').PodSummary[]
      nodeclaims: import('../types/api').NodeClaimSummary[]
      nodepools: import('../types/api').NodePoolSummary[]
      nodes: import('../types/api').NodeSummary[]
    }>('/api/graph'),
  controllerLogs: (params?: { tail?: number }) => {
    const search = params?.tail ? `?tail=${params.tail}` : ''
    return fetchJSON<{ logs: string; pod?: string; error?: string }>('/api/logs/controller' + search)
  },
}
