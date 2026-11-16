import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger' | 'maroon'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'text-ink-muted',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  info: 'text-maroon-700',
  danger: 'text-red-700',
  maroon: 'text-maroon-700',
}

const dotStyles: Record<BadgeTone, string> = {
  neutral: 'bg-stone-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-maroon-600',
  danger: 'bg-red-500',
  maroon: 'bg-maroon-600',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]',
        toneStyles[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', dotStyles[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}
