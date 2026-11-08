import type { ApiSuccessResponse } from '@/types/api'
import type { AuthSession, AuthUser, LoginCredentials } from '@/types/auth'
import { apiClient, bootstrapCsrfCookie } from '@/services/api/client'

export async function loginRequest(credentials: LoginCredentials): Promise<AuthSession> {
  await bootstrapCsrfCookie()

  const { data } = await apiClient.post<ApiSuccessResponse<AuthSession>>(
    '/auth/login',
    credentials,
  )

  return data.data
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ user: AuthUser }>>('/auth/me')

  return data.data.user
}

export async function logoutRequest(): Promise<void> {
  await bootstrapCsrfCookie()
  await apiClient.post('/auth/logout')
}
