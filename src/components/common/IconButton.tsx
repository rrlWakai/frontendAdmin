import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }

export function IconButton({ label, children, className = '', ...rest }: Props) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft ${className}`}
        {...rest}
      >
        {children}
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-maroon-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  )
}
