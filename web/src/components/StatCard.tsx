import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export type StatCardAccent = 'default' | 'success' | 'warning' | 'info'

interface StatCardProps {
  title: string
  value: number | string
  label?: React.ReactNode
  to?: string
  icon?: LucideIcon
  accent?: StatCardAccent
}

const accentValueClasses: Record<StatCardAccent, string> = {
  default: 'text-gray-900 dark:text-gray-100',
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-blue-700 dark:text-blue-400',
}

export function StatCard({ title, value, label, to, icon: Icon, accent = 'default' }: StatCardProps) {
  const content = (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 transition hover:shadow hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
        {Icon && <Icon className="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${accentValueClasses[accent]}`}>{value}</div>
      {label != null && <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>}
    </div>
  )
  if (to) {
    return <Link to={to} className="block min-w-0 h-full">{content}</Link>
  }
  return <div className="min-w-0 h-full">{content}</div>
}
