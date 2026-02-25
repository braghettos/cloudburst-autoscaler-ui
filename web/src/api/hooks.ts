import { useQuery } from '@tanstack/react-query'
import type {
  ClusterInfo,
  DashboardStats,
  NodeClaimSummary,
  NodePoolSummary,
  NodeSummary,
  PodSummary,
} from '../types/api'
import { api } from './client'

export function useClusters() {
  return useQuery<ClusterInfo[]>({
    queryKey: ['clusters'],
    queryFn: api.clusters,
  })
}

export function useDashboard(clusterId?: string) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', clusterId],
    queryFn: () => api.dashboard(clusterId),
    enabled: !!clusterId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}

export function usePods(params?: { clusterId?: string; namespace?: string; phase?: string }) {
  return useQuery<PodSummary[]>({
    queryKey: ['pods', params?.clusterId, params?.namespace, params?.phase],
    queryFn: () => api.pods(params),
    enabled: !!params?.clusterId,
  })
}

export function usePod(clusterId: string | undefined, namespace: string, name: string | undefined) {
  return useQuery<PodSummary>({
    queryKey: ['pod', clusterId, namespace, name],
    queryFn: () => api.pod(clusterId, namespace, name!),
    enabled: !!namespace && !!name,
  })
}

export function useNodeClaims(params?: {
  clusterId?: string
  namespace?: string
  phase?: string
}) {
  return useQuery<NodeClaimSummary[]>({
    queryKey: ['nodeclaims', params?.clusterId, params?.namespace, params?.phase],
    queryFn: () => api.nodeclaims(params),
    enabled: !!params?.clusterId,
  })
}

export function useNodeClaim(
  clusterId: string | undefined,
  namespace: string,
  name: string | undefined
) {
  return useQuery<NodeClaimSummary>({
    queryKey: ['nodeclaim', clusterId, namespace, name],
    queryFn: () => api.nodeclaim(clusterId, namespace, name!),
    enabled: !!namespace && !!name,
  })
}

export function useNodePools(params?: { clusterId?: string; namespace?: string }) {
  return useQuery<NodePoolSummary[]>({
    queryKey: ['nodepools', params?.clusterId, params?.namespace],
    queryFn: () => api.nodepools(params),
    enabled: !!params?.clusterId,
  })
}

export function useNodePool(
  clusterId: string | undefined,
  namespace: string,
  name: string | undefined
) {
  return useQuery<NodePoolSummary>({
    queryKey: ['nodepool', clusterId, namespace, name],
    queryFn: () => api.nodepool(clusterId, namespace, name!),
    enabled: !!namespace && !!name,
  })
}

export function useNodes(clusterId?: string) {
  return useQuery<NodeSummary[]>({
    queryKey: ['nodes', clusterId],
    queryFn: () => api.nodes(clusterId),
    enabled: !!clusterId,
  })
}

export function useNode(clusterId: string | undefined, name: string | undefined) {
  return useQuery<NodeSummary>({
    queryKey: ['node', clusterId, name],
    queryFn: () => api.node(clusterId, name!),
    enabled: !!name,
  })
}

export function useControllerLogs(clusterId?: string, tail?: number) {
  return useQuery({
    queryKey: ['controllerLogs', clusterId, tail],
    queryFn: () => api.controllerLogs({ clusterId, tail }),
    enabled: !!clusterId,
    refetchInterval: 5000,
  })
}

export function useGraphData(clusterId?: string) {
  const query = useQuery({
    queryKey: ['graph', clusterId],
    queryFn: () => api.graph(clusterId),
    enabled: !!clusterId,
    refetchInterval: 5000,
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
