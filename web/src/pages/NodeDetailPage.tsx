import { Link, useParams } from 'react-router-dom'
import { useNode } from '../api/hooks'

export function NodeDetailPage() {
  const { name = '' } = useParams<{ name: string }>()
  const { data: node, isLoading, isError, error } = useNode(name)

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded" />
  }
  if (isError || !node) {
    return (
      <div className="text-red-600 dark:text-red-400">
        {error instanceof Error ? error.message : 'Node not found'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-primary-600">Overview</Link>
        <span className="mx-1">/</span>
        <Link to="/nodes" className="hover:text-primary-600">Nodes</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900 dark:text-gray-100">{node.name}</span>
      </nav>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{node.name}</h2>
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-gray-500 dark:text-gray-400">CloudBurst Managed</dt>
          <dd>{node.cloudburstManaged ? 'Yes' : 'No'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">Ready</dt>
          <dd>{node.ready ? 'Yes' : 'No'}</dd>
        </dl>
      </div>
    </div>
  )
}
