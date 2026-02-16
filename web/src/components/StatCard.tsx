import { Link } from 'react-router-dom'

interface StatCardProps {
  title: string
  value: number | string
  label?: string
  to?: string
}

export function StatCard({ title, value, label, to }: StatCardProps) {
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 transition hover:shadow-md hover:-translate-y-0.5">
      <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
      <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
      {label && <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>}
    </div>
  )
  if (to) {
    return <Link to={to}>{content}</Link>
  }
  return content
}
