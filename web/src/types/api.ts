export interface PodSummary {
  namespace: string
  name: string
  phase: string
  nodeName?: string
  cpuRequest?: string
  memoryRequest?: string
  unschedulable: boolean
  unschedulableMsg?: string
  creationTimestamp: string
}

export interface InstanceDetailsSummary {
  provider: string
  region: string
  instanceType: string
  vcpu: number
  ramGb: number
  priceEurPerHour: number
}

export interface RecommendationRequestSummary {
  minVcpu: number
  minRamGb: number
  regionConstraint?: string
  maxPriceEurPerHour: number
  arch?: string
  allowedProviders?: string[]
  dataSourceProvider?: string
  dataSourceRegion?: string
  estimatedEgressGbPerHour?: number
  maxTCOEurPerHour?: number
}

export interface NodeClaimSummary {
  namespace: string
  name: string
  phase: string
  nodePoolRef: string
  provider: string
  region: string
  instanceType: string
  vcpu: number
  ramGb: number
  priceEurPerHour: number
  instanceID?: string
  nodeName?: string
  recommendationRequest?: RecommendationRequestSummary
  recommendationUsed?: InstanceDetailsSummary
  lastError?: string
  createdAt?: string
  readyAt?: string
  lastTransition?: string
  creationTimestamp: string
}

export interface NodePoolSummary {
  namespace: string
  name: string
  regionConstraint: string
  maxNodes: number
  minNodes: number
  nodeClaimCount: number
  creationTimestamp: string
}

export interface NodeSummary {
  name: string
  cloudburstManaged: boolean
  ready: boolean
  creationTimestamp: string
}

export interface ClusterInfo {
  id: string
  name: string
  context: string
  reachable: boolean
  totalNodes: number
  cloudburstNodes: number
  totalNodeClaims: number
  pendingPods: number
}

export interface DashboardStats {
  totalPods: number
  pendingPods: number
  runningPods: number
  unschedulablePods: number
  nodeClaimsByPhase: Record<string, number>
  totalNodeClaims: number
  nodePoolCount: number
  totalNodes: number
  cloudburstNodes: number
}
