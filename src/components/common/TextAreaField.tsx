import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const messageId = `${fieldId}-message`

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(
          'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-ink-muted/75 focus:border-maroon-500 focus:outline-none focus:ring-2 focus:ring-maroon-500/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-ink-muted/70',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
        )}
        {...props}
      />
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
