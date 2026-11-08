import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { AuthContext } from '@/contexts/AuthContext'
import type { AuthContextValue } from '@/contexts/AuthContext'
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
} from '@/services/api/auth'
import { FORBIDDEN_EVENT, UNAUTHORIZED_EVENT } from '@/services/api/client'
import { revalidateAdminSession } from '@/services/auth/revalidateAdminSession'
import { isAdminRole } from '@/types/auth'
import type { AuthSession, AuthStatus, LoginCredentials } from '@/types/auth'

interface AuthProviderProps {
  children: ReactNode
}

const ADMIN_ROLE_ERROR =
  'This account cannot access CCSync Admin. Use the ClassFlow workspace instead.'

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const forbiddenCheckRef = useRef<Promise<void> | null>(null)

  const restoreSession = useCallback(async (isCurrent: () => boolean = () => true) => {
    try {
      const user = await fetchCurrentUser()

      if (!isCurrent()) {
        return
      }

      if (isAdminRole(user.role)) {
        setSession({ user })
        setStatus('authenticated')
        return
      }

      await logoutRequest()

      if (isCurrent()) {
        setSession(null)
        setStatus('unauthorized')
      }
    } catch (sessionError) {
      if (!isCurrent()) {
        return
      }

      setSession(null)

      if (isAxiosError(sessionError) && sessionError.response?.status === 401) {
        setStatus('unauthenticated')
        return
      }

      setError('Unable to verify or end your session. Check the API connection and retry.')
      setStatus('error')
    }
  }, [])

  const revalidateForbiddenSession = useCallback(async () => {
    const result = await revalidateAdminSession({
      fetchUser: fetchCurrentUser,
      logout: logoutRequest,
    })

    if (result.status === 'authenticated') {
      setSession({ user: result.user })
      setError(null)
      setStatus('authenticated')
      return
    }

    if (result.status === 'unauthorized') {
      setSession(null)
      setError(null)
      setStatus('unauthorized')
      return
    }

    if (result.status === 'unauthenticated') {
      setSession(null)
      setError(null)
      setStatus('unauthenticated')
    }
  }, [])

  const handleForbidden = useCallback(() => {
    if (forbiddenCheckRef.current) {
      return forbiddenCheckRef.current
    }

    const check = revalidateForbiddenSession()
      .catch(() => undefined)
      .finally(() => {
        forbiddenCheckRef.current = null
      })

    forbiddenCheckRef.current = check

    return check
  }, [revalidateForbiddenSession])

  useEffect(() => {
    let active = true

    void Promise.resolve().then(() => restoreSession(() => active))

    return () => {
      active = false
    }
  }, [restoreSession])

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null)
      setError(null)
      setStatus('unauthenticated')
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [])

  useEffect(() => {
    const handleForbiddenEvent = () => {
      void handleForbidden()
    }

    window.addEventListener(FORBIDDEN_EVENT, handleForbiddenEvent)

    return () => {
      window.removeEventListener(FORBIDDEN_EVENT, handleForbiddenEvent)
    }
  }, [handleForbidden])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = await loginRequest(credentials)

    if (!isAdminRole(nextSession.user.role)) {
      try {
        await logoutRequest()
      } catch {
        setSession(null)
        setError('Unable to end this session. Retry the session check before continuing.')
        setStatus('error')
        throw new Error('Unable to end this session. Retry the session check before continuing.')
      }

      throw new Error(ADMIN_ROLE_ERROR)
    }

    setSession(nextSession)
    setError(null)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
      setSession(null)
      setError(null)
      setStatus('unauthenticated')
    } catch {
      setSession(null)
      setError('Unable to confirm sign out. Retry the session check.')
      setStatus('error')
    }
  }, [])

  const retrySession = useCallback(() => {
    setStatus('loading')
    setError(null)

    return restoreSession()
  }, [restoreSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      error,
      session,
      user: session?.user ?? null,
      login,
      logout,
      retrySession,
    }),
    [error, login, logout, retrySession, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
