import { useQuery } from '@tanstack/react-query'
import type { DashboardStats, NodeClaimSummary, NodePoolSummary, NodeSummary, PodSummary } from '../types/api'
import { api } from './client'

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: api.dashboard,
  })
}

export function usePods(params?: { namespace?: string; phase?: string }) {
  return useQuery<PodSummary[]>({
    queryKey: ['pods', params?.namespace, params?.phase],
    queryFn: () => api.pods(params),
  })
}

export function usePod(namespace: string, name: string | undefined) {
  return useQuery<PodSummary>({
    queryKey: ['pod', namespace, name],
    queryFn: () => api.pod(namespace, name!),
    enabled: !!namespace && !!name,
  })
}

export function useNodeClaims(params?: { namespace?: string; phase?: string }) {
  return useQuery<NodeClaimSummary[]>({
    queryKey: ['nodeclaims', params?.namespace, params?.phase],
    queryFn: () => api.nodeclaims(params),
  })
}

export function useNodeClaim(namespace: string, name: string | undefined) {
  return useQuery<NodeClaimSummary>({
    queryKey: ['nodeclaim', namespace, name],
    queryFn: () => api.nodeclaim(namespace, name!),
    enabled: !!namespace && !!name,
  })
}

export function useNodePools(params?: { namespace?: string }) {
  return useQuery<NodePoolSummary[]>({
    queryKey: ['nodepools', params?.namespace],
    queryFn: () => api.nodepools(params),
  })
}

export function useNodePool(namespace: string, name: string | undefined) {
  return useQuery<NodePoolSummary>({
    queryKey: ['nodepool', namespace, name],
    queryFn: () => api.nodepool(namespace, name!),
    enabled: !!namespace && !!name,
  })
}

export function useNodes() {
  return useQuery<NodeSummary[]>({
    queryKey: ['nodes'],
    queryFn: api.nodes,
  })
}

export function useNode(name: string | undefined) {
  return useQuery<NodeSummary>({
    queryKey: ['node', name],
    queryFn: () => api.node(name!),
    enabled: !!name,
  })
}

export function useControllerLogs(tail?: number) {
  return useQuery({
    queryKey: ['controllerLogs', tail],
    queryFn: () => api.controllerLogs({ tail }),
    refetchInterval: 5000,
  })
}

export function useGraphData() {
  const query = useQuery({
    queryKey: ['graph'],
    queryFn: api.graph,
    refetchInterval: 5000, // refresh every 5s during E2E
  })
  const data = query.data
  return {
    pods: data?.pods ?? [],
    nodeclaims: data?.nodeclaims ?? [],
    nodepools: data?.nodepools ?? [],
    nodes: data?.nodes ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
