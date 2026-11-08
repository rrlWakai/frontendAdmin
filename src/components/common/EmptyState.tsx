import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-700">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <h3 className="mt-5 font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  )
}
