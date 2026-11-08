import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute() {
  const { status, error, retrySession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <LoaderCircle className="size-5 animate-spin text-brand-600" aria-hidden="true" />
          Restoring session
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <p role="alert" className="max-w-md text-sm leading-6 text-ink-muted">
          {error}
        </p>
        <Button onClick={() => void retrySession()}>Retry session check</Button>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return <Navigate to="/unauthorized" replace />
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
