import { BRANDING } from '@/config/branding'
import { cn } from '@/utils/cn'

interface LogoProps {
  compact?: boolean
  light?: boolean
  className?: string
}

export function Logo({ compact = false, light = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={BRANDING.logo}
        alt="CCSync Admin"
        width={compact ? 40 : 48}
        height={compact ? 40 : 48}
        className={cn(
          'shrink-0 rounded-xl bg-white object-contain shadow-sm ring-1',
          light ? 'ring-white/25' : 'ring-maroon-200',
          compact ? 'size-10 p-0.5' : 'size-12 p-1',
        )}
      />
      {compact ? null : (
        <div className="min-w-0 leading-none">
          <p
            className={cn(
              'font-semibold tracking-tight',
              light ? 'text-white' : 'text-ink',
            )}
          >
            CCSync{' '}
            <span className={light ? 'text-gold-300' : 'text-maroon-600'}>Admin</span>
          </p>
          <p
            className={cn(
              'mt-1 truncate text-[10px] font-medium uppercase tracking-[0.2em]',
              light ? 'text-gold-200/80' : 'text-maroon-600/70',
            )}
          >
            College of Computer Studies
          </p>
        </div>
      )}
    </div>
  )
}
