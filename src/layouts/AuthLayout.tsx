import type { ReactNode } from 'react'
import { Logo } from '@/components/layout/Logo'
import { BRANDING } from '@/config/branding'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-surface lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative isolate flex flex-col gap-8 overflow-hidden bg-maroon-900 px-5 py-6 sm:px-8 lg:min-h-svh lg:justify-between lg:gap-0 lg:px-12 lg:py-12 xl:px-14">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${BRANDING.campusImage})` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{ background: BRANDING.campusOverlay }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(circle at 85% 8%, rgba(245,185,0,0.16), transparent 42%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-28 -top-24 -z-10 size-[24rem] rounded-full border border-gold-400/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-12 -top-4 -z-10 size-[15rem] rounded-full border border-gold-400/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-[22rem] rounded-full bg-gold-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent"
          aria-hidden="true"
        />

        <div className="relative">
          <Logo light />
          <p className="mt-4 max-w-xs text-xs leading-5 text-white/70 lg:hidden">
            Administrative console for the College of Computer Studies.
          </p>
        </div>

        <div className="relative hidden max-w-xl lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">
            CCSync Administrative Console
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-[-0.02em] text-white xl:text-5xl">
            Academic operations, coordinated from one place.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/70">
            A centralized foundation for departmental records, faculty, students, scheduling,
            attendance, and college activities.
          </p>
          <div
            className="mt-8 h-px w-24 bg-gradient-to-r from-gold-400/80 to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="relative hidden items-center gap-3 text-xs text-white/55 lg:flex">
          <span className="size-1.5 rounded-full bg-gold-400" aria-hidden="true" />
          Phase 1 foundation · API v1
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-surface px-4 py-10 sm:px-6 lg:min-h-svh">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
