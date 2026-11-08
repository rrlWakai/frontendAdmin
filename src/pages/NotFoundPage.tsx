import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
          CCSync Admin
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          The administrative page you requested does not exist or has not been added to this
          foundation.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Return to dashboard
        </Link>
      </div>
    </div>
  )
}
