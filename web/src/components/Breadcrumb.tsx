import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-gray-400 dark:text-gray-500" aria-hidden>
                  /
                </span>
              )}
              {isLast ? (
                <span
                  className="text-gray-900 dark:text-gray-100 font-medium"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.to ? (
                <Link
                  to={item.to}
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
