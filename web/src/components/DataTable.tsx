import { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (item: T, index: number) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyMessage} />
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {data.map((item, i) => (
            <tr
              key={rowKey(item, i)}
              onClick={() => onRowClick?.(item)}
              className={
                onRowClick
                  ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition'
                  : ''
              }
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                  {c.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
