import { useState } from 'react'
import { useCluster } from '../contexts/ClusterContext'
import { useControllerLogs } from '../api/hooks'
import { RefreshCw } from 'lucide-react'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function LogsPage() {
  const { apiClusterId } = useCluster()
  const [tail, setTail] = useState(500)
  const { data, isLoading, isError, error, refetch, isFetching } = useControllerLogs(apiClusterId, tail)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold">CloudBurst Controller Logs</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tail lines</span>
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
            >
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
              <option value={5000}>5000</option>
            </select>
          </label>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {data?.pod && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing logs from pod: <span className="font-mono">{data.pod}</span> (cloudburst-system)
        </p>
      )}

      {isLoading && <LoadingSkeleton variant="graph" />}
      {isError && (
        <ErrorAlert
          error={error ?? new Error('Failed to load')}
          title="Failed to load controller logs"
        />
      )}
      {data?.error && !data.logs && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
          <p className="font-medium">No logs available</p>
          <p className="text-sm mt-1">{data.error}</p>
        </div>
      )}
      {data?.logs !== undefined && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-900">
          <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto overflow-y-auto max-h-[70vh] whitespace-pre-wrap break-words">
            {data.logs || '(no log output)'}
          </pre>
        </div>
      )}
    </div>
  )
}
