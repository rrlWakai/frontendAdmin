import { LogOut, Megaphone, Menu, ShieldCheck } from 'lucide-react'
import { Link, useMatches } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { RouteHandle } from '@/routes/types'
import { IconButton } from '@/components/common/IconButton'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const matches = useMatches()
  const leaf = matches.at(-1)
  const title = (leaf?.handle as RouteHandle | undefined)?.title ?? 'Dashboard'
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur md:px-8 shadow-sm">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink-muted transition hover:bg-surface-soft hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          CCSync Admin
        </p>
        <h1 className="truncate font-semibold text-lg text-ink">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink-muted sm:inline-flex">
          <span className="size-1.5 rounded-full bg-maroon-600" aria-hidden="true" />
          {user?.roleLabel ?? 'Administrative access'}
        </span>

        <span className="group relative inline-flex">
          <Link to="/activities?view=announcements" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-soft hover:text-ink" aria-label="Open announcements">
            <Megaphone className="size-[18px]" aria-hidden="true" />
          </Link>
          <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-maroon-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">Open announcements</span>
        </span>

        <div className="flex items-center gap-2.5 border-l border-line pl-2 sm:pl-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-maroon-50 text-maroon-700">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </div>
          <div className="hidden leading-tight md:block">
            <p className="max-w-[160px] truncate text-xs font-semibold text-ink">
              {user?.name ?? 'Admin console'}
            </p>
            <p className="text-[11px] text-ink-muted">
              {user?.roleLabel ?? 'Phase 2 access control'}
            </p>
          </div>
          <IconButton label="Sign out" onClick={() => void logout()}>
            <LogOut className="size-[18px]" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
