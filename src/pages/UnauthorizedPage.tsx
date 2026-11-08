import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
          CCSync Admin
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
          Access not authorized
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This account cannot access the administrative console. Use an administrator or
          department personnel account, or sign in to the ClassFlow workspace.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to sign in
        </Link>
      </div>
    </div>
  )
}
