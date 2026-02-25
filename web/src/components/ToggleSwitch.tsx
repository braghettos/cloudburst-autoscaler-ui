interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  id?: string
}

export function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  const inputId = id ?? `toggle-${label.replace(/\s/g, '-').toLowerCase()}`
  return (
    <label htmlFor={inputId} className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow absolute top-0.5 transition-all ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </span>
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  )
}
