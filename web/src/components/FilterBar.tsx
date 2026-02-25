import { ReactNode } from 'react'

const inputClasses =
  'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

interface FilterBarProps {
  children: ReactNode
  className?: string
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div
      className={`flex flex-wrap gap-4 items-end ${className}`}
      role="search"
      aria-label="Filter controls"
    >
      {children}
    </div>
  )
}

interface FilterFieldProps {
  id: string
  label: string
  children: ReactNode
  className?: string
}

export function FilterField({ id, label, children, className = '' }: FilterFieldProps) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  )
}

interface FilterInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string
  type?: 'text' | 'search'
}

export function FilterInput({ id, type = 'text', className = '', ...props }: FilterInputProps) {
  return (
    <input
      id={id}
      type={type}
      className={`${inputClasses} ${className}`}
      aria-label={props['aria-label'] ?? props.placeholder}
      {...props}
    />
  )
}

interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  id: string
  options: FilterSelectOption[]
}

export function FilterSelect({ id, options, className = '', ...props }: FilterSelectProps) {
  return (
    <select
      id={id}
      className={`${inputClasses} ${className}`}
      aria-label={props['aria-label'] ?? undefined}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

interface FilterActionsProps {
  children: ReactNode
  className?: string
}

export function FilterActions({ children, className = '' }: FilterActionsProps) {
  return <div className={`flex flex-wrap gap-2 items-center ${className}`}>{children}</div>
}
