import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import type { ClusterInfo } from '../types/api'

interface ClusterContextValue {
  clusterId: string | null
  /** For API calls: cluster ID when on a cluster-scoped page, undefined when on fleet home */
  apiClusterId: string | undefined
  clusters: ClusterInfo[]
  setClusterId: (id: string | null) => void
  isMultiCluster: boolean
}

const ClusterContext = createContext<ClusterContextValue | null>(null)

/** Extract clusterId from path /clusters/:clusterId/... when useParams may not have it yet */
function clusterIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/clusters\/([^/]+)/)
  return m ? m[1] : null
}

export function ClusterProvider({ children, clusters }: { children: ReactNode; clusters: ClusterInfo[] }) {
  const { clusterId: paramClusterId } = useParams<{ clusterId?: string }>()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Prefer param; fallback to path when on cluster-scoped URL (handles Router timing edge cases)
  const clusterId = paramClusterId ?? clusterIdFromPath(pathname) ?? null
  const isMultiCluster = clusters.length > 1
  const apiClusterId = clusterId ?? undefined

  const setClusterId = useCallback(
    (id: string | null) => {
      if (!id) return
      navigate(`/clusters/${id}/overview`)
    },
    [navigate]
  )

  const value: ClusterContextValue = {
    clusterId,
    apiClusterId,
    clusters,
    setClusterId,
    isMultiCluster,
  }

  return <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>
}

export function useCluster() {
  const ctx = useContext(ClusterContext)
  if (!ctx) {
    throw new Error('useCluster must be used within ClusterProvider')
  }
  return ctx
}
