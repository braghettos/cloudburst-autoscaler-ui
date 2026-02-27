import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Package, Cpu, Server, Layers } from 'lucide-react'

export type ResourceNodeType = 'nodepool' | 'nodeclaim' | 'node' | 'pod'

export interface ResourceNodeData {
  /** Display label (fallback when namespace/name not split) */
  label?: string
  namespace?: string
  name: string
  type: ResourceNodeType
  cloudburstManaged?: boolean
}

const TYPE_CONFIG: Record<
  ResourceNodeType,
  { icon: typeof Package; bg: string; border: string; text: string; label: string }
> = {
  nodepool: {
    icon: Package,
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-500 dark:border-blue-400',
    text: 'text-blue-900 dark:text-blue-100',
    label: 'NodePool',
  },
  nodeclaim: {
    icon: Cpu,
    bg: 'bg-green-100 dark:bg-green-900/40',
    border: 'border-green-600 dark:border-green-400',
    text: 'text-green-900 dark:text-green-100',
    label: 'NodeClaim',
  },
  node: {
    icon: Server,
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    border: 'border-purple-600 dark:border-purple-400',
    text: 'text-purple-900 dark:text-purple-100',
    label: 'Node',
  },
  pod: {
    icon: Layers,
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    border: 'border-amber-600 dark:border-amber-400',
    text: 'text-amber-900 dark:text-amber-100',
    label: 'Pod',
  },
}

function ResourceNodeComponent(props: NodeProps) {
  const { selected } = props
  const data = props.data as unknown as ResourceNodeData
  const config = TYPE_CONFIG[data?.type ?? 'pod'] ?? TYPE_CONFIG.pod
  const Icon = config.icon
  const isCloudBurst = data.type === 'node' && data.cloudburstManaged
  const name = String(data.name ?? data.label ?? '')
  const namespace = data.namespace != null && data.namespace !== '' ? String(data.namespace) : undefined
  const title = namespace ? `${namespace}/${name}` : name

  return (
    <div
      className={`
        px-4 py-2.5 rounded-lg border-2 min-w-[160px] max-w-[360px]
        ${config.bg} ${config.border} ${config.text}
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2" />
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{config.label}</div>
          {namespace != null ? (
            <>
              <div className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate" title={namespace}>
                {namespace}
              </div>
              <div title={title} className="font-mono text-sm break-words line-clamp-2">
                {name}
              </div>
            </>
          ) : (
            <div title={title} className="font-mono text-sm break-words line-clamp-2">
              {name}
            </div>
          )}
          {isCloudBurst && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary-500/20 text-primary-700 dark:text-primary-300">
              CloudBurst
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2" />
    </div>
  )
}

export const ResourceNode = memo(ResourceNodeComponent)
