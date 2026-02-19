import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'

const mainPathPhases = ['Pending', 'Provisioning', 'Joining', 'Ready'] as const
const endStatePhases = ['Failed', 'Deleting'] as const

const phaseTooltips: Record<string, string> = {
  Pending: 'NodeClaim created, waiting to provision',
  Provisioning: 'Cloud instance being created',
  Joining: 'Instance joining the Kubernetes cluster',
  Ready: 'Node is ready and can schedule pods',
  Failed: 'Provisioning or joining failed',
  Deleting: 'Node is being removed (scale-down)',
}

export function LifecycleLegend() {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden />
          )}
          <span className="text-gray-500 dark:text-gray-400 font-medium">Node lifecycle</span>
          <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">
            Phases of CloudBurst-provisioned NodeClaims
          </span>
        </span>
        {!expanded && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Pending → … → Ready | Failed | Deleting
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
            <Link to="/nodeclaims" className="text-primary-600 dark:text-primary-400 hover:underline">
              View NodeClaims
            </Link>
            {' · '}
            Main path and end states:
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Main path:</span>
            {mainPathPhases.map((p, i) => (
              <span key={p} className="flex items-center gap-1">
                <span
                  title={phaseTooltips[p]}
                  className={p === 'Ready' ? 'ring-1 ring-green-500/30 dark:ring-green-400/30 rounded-full' : ''}
                >
                  <StatusBadge phase={p} />
                </span>
                {i < mainPathPhases.length - 1 && (
                  <span className="text-gray-400 dark:text-gray-500 text-xs" aria-hidden>→</span>
                )}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">End states:</span>
            {endStatePhases.map((p) => (
              <span key={p} title={phaseTooltips[p]}>
                <StatusBadge phase={p} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
