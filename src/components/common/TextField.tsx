import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
}

export function TextField({
  label,
  error,
  hint,
  leftIcon,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const messageId = `${fieldId}-message`

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
            {leftIcon}
          </span>
        ) : null}
        <input
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-sm transition placeholder:text-ink-muted/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            leftIcon ? 'pl-10' : undefined,
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={messageId} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
