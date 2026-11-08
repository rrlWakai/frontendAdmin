import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger' | 'maroon'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'border-line bg-stone-50 text-ink-muted',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-maroon-200 bg-maroon-50 text-maroon-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  maroon: 'border-maroon-100 bg-maroon-50 text-maroon-700',
}

const dotStyles: Record<BadgeTone, string> = {
  neutral: 'bg-stone-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-maroon-500',
  danger: 'bg-red-500',
  maroon: 'bg-maroon-500',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
        toneStyles[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dotStyles[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}
