/**
 * Build a cluster-scoped path.
 * When clusterId is set, returns /clusters/{clusterId}{path}.
 * Otherwise returns path (used when clusterId is missing; may hit catch-all redirect).
 */
export function clusterPath(clusterId: string | null | undefined, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return clusterId ? `/clusters/${clusterId}${p}` : p
}
