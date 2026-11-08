import { useState } from 'react'
import type { FormEvent } from 'react'
import { Info, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/TextField'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/layouts/AuthLayout'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'

interface LoginErrors {
  email?: string
  password?: string
}

interface LoginLocationState {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: LoginErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Enter your password.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      await login({ email: email.trim(), password, remember })

      const state = location.state as LoginLocationState | null
      navigate(state?.from?.pathname ?? '/dashboard', { replace: true })
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error)

      if (fieldErrors.email?.length) {
        setErrors((current) => ({ ...current, email: fieldErrors.email[0] }))
      }

      if (fieldErrors.password?.length) {
        setErrors((current) => ({ ...current, password: fieldErrors.password[0] }))
      }

      setFormError(
        getApiErrorMessage(
          error,
          'Unable to sign in. Check your credentials and try again.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-maroon-600">
          Administrative access
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
          Sign in to CCSync
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Use your administrator or department personnel account to continue.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-[0_18px_50px_-32px_rgba(53,0,17,0.45)] sm:p-8">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-maroon-700 via-maroon-500 to-gold-400"
          aria-hidden="true"
        />

        <div className="mb-6 flex gap-3 rounded-xl border border-maroon-200 bg-maroon-50 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-maroon-700" aria-hidden="true" />
          <p className="text-xs leading-5 text-maroon-900">
            Sign in with an administrator or department personnel account. Sessions are
            protected by HttpOnly cookies and CSRF validation.
          </p>
        </div>

        {formError ? (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="name@ccs.edu.ph"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            leftIcon={<Mail className="size-4" aria-hidden="true" />}
          />

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            leftIcon={<LockKeyhole className="size-4" aria-hidden="true" />}
          />

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="size-4 rounded border-line text-maroon-700 accent-maroon-700 focus:ring-maroon-500"
              />
              Remember this device
            </label>
            <span className="text-xs text-ink-muted">Forgot password? Contact IT.</span>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            leftIcon={<LogIn className="size-4" aria-hidden="true" />}
          >
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-ink-muted">
        Enforced by Laravel Sanctum with server-side session validation.
      </p>
    </AuthLayout>
  )
}
