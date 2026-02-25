import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'
import { EmptyState, type EmptyStateAction } from './EmptyState'
import type { LucideIcon } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  /** Enable sorting for this column */
  sortable?: boolean
  /** Extract value for sorting: key path or function */
  sortKey?: keyof T | ((item: T) => string | number)
  /** Use sticky positioning on small screens (e.g. namespace/name) */
  sticky?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (item: T, index: number) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  emptyPrimaryAction?: EmptyStateAction
  emptySecondaryAction?: EmptyStateAction
  /** Enable pagination when row count exceeds this threshold */
  paginationThreshold?: number
  pageSizeOptions?: number[]
  /** Show column visibility toggle when column count >= this (default 6) */
  columnVisibilityThreshold?: number
}

function getSortValue<T>(item: T, col: Column<T>): string | number {
  if (col.sortKey === undefined) return ''
  if (typeof col.sortKey === 'function') return col.sortKey(item)
  const val = (item as Record<string, unknown>)[col.sortKey as string]
  return typeof val === 'string' || typeof val === 'number' ? val : ''
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = 'No data',
  emptyDescription,
  emptyIcon,
  emptyPrimaryAction,
  emptySecondaryAction,
  paginationThreshold = 50,
  pageSizeOptions = [25, 50, 100],
  columnVisibilityThreshold = 6,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set())

  const showColumnToggle = columns.length >= columnVisibilityThreshold
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.has(c.key)),
    [columns, hiddenColumns]
  )

  const toggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else {
        if (visibleColumns.length <= 1) return prev
        next.add(key)
      }
      return next
    })
    if (sortKey === key) setSortKey(null)
  }

  const sortedData = useMemo(() => {
    const col = visibleColumns.find((c) => c.key === sortKey && c.sortable)
    if (!col) return data
    return [...data].sort((a, b) => {
      const va = getSortValue(a, col)
      const vb = getSortValue(b, col)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, visibleColumns, sortKey, sortDir])

  const paginatedData = useMemo(() => {
    if (sortedData.length <= paginationThreshold) return sortedData
    const start = page * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, page, pageSize, paginationThreshold])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const showPagination = sortedData.length > paginationThreshold

  const handleSort = (colKey: string) => {
    const col = visibleColumns.find((c) => c.key === colKey && c.sortable)
    if (!col) return
    if (sortKey === colKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(colKey)
      setSortDir('asc')
    }
    setPage(0)
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        icon={emptyIcon}
        primaryAction={emptyPrimaryAction}
        secondaryAction={emptySecondaryAction}
      />
    )
  }

  return (
    <div className="space-y-3">
      {showColumnToggle && (
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={() => setColumnMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
            aria-expanded={columnMenuOpen}
            aria-haspopup="true"
            aria-label="Toggle column visibility"
          >
            <Columns3 className="w-4 h-4" aria-hidden />
            Columns
          </button>
          {columnMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setColumnMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 z-20 py-2 min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
                role="menu"
              >
                {columns.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm"
                    role="menuitemcheckbox"
                    aria-checked={!hiddenColumns.has(c.key)}
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    {c.header}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase ${
                    c.sticky ? 'sticky left-0 z-10 bg-gray-50 dark:bg-gray-800' : ''
                  } ${c.sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                  onClick={() => c.sortable && handleSort(c.key)}
                >
                  <span className="flex items-center gap-1">
                    {c.header}
                    {c.sortable && sortKey === c.key &&
                      (sortDir === 'asc' ? (
                        <ChevronUp className="w-4 h-4" aria-hidden />
                      ) : (
                        <ChevronDown className="w-4 h-4" aria-hidden />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {paginatedData.map((item, i) => (
              <tr
                key={rowKey(item, i)}
                onClick={() => onRowClick?.(item)}
                className={`group ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition'
                    : ''
                }`}
              >
                {visibleColumns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 ${
                      c.sticky
                        ? 'sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800'
                        : ''
                    }`}
                  >
                    {c.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          role="navigation"
          aria-label="Table pagination"
        >
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <label htmlFor="page-size-select" className="sr-only">
              Rows per page
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
            <span>
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm text-gray-600 dark:text-gray-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
