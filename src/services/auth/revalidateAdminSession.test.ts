import { describe, expect, it, vi } from 'vitest'
import { revalidateAdminSession } from './revalidateAdminSession'
import type { AuthUser } from '@/types/auth'

function createUser(role: AuthUser['role']): AuthUser {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role,
    roleLabel: role,
    status: 'active',
    profile: null,
  }
}

function createHttpError(status: number) {
  return Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status },
  })
}

describe('revalidateAdminSession', () => {
  it('keeps an administrator session authenticated', async () => {
    const user = createUser('administrator')
    const logout = vi.fn(async () => undefined)

    const result = await revalidateAdminSession({
      fetchUser: async () => user,
      logout,
    })

    expect(result).toEqual({ status: 'authenticated', user })
    expect(logout).not.toHaveBeenCalled()
  })

  it('keeps a department personnel session authenticated', async () => {
    const user = createUser('department_personnel')
    const logout = vi.fn(async () => undefined)

    const result = await revalidateAdminSession({
      fetchUser: async () => user,
      logout,
    })

    expect(result).toEqual({ status: 'authenticated', user })
    expect(logout).not.toHaveBeenCalled()
  })

  it('logs out and marks a non-admin session unauthorized', async () => {
    const logout = vi.fn(async () => undefined)

    const result = await revalidateAdminSession({
      fetchUser: async () => createUser('professor'),
      logout,
    })

    expect(result).toEqual({ status: 'unauthorized' })
    expect(logout).toHaveBeenCalledOnce()
  })

  it('clears the local session when logout fails', async () => {
    const logout = vi.fn(async () => {
      throw new Error('Logout failed')
    })

    const result = await revalidateAdminSession({
      fetchUser: async () => createUser('student'),
      logout,
    })

    expect(result).toEqual({ status: 'unauthorized' })
    expect(logout).toHaveBeenCalledOnce()
  })

  it('treats a 401 session check as unauthenticated', async () => {
    const logout = vi.fn(async () => undefined)

    const result = await revalidateAdminSession({
      fetchUser: async () => {
        throw createHttpError(401)
      },
      logout,
    })

    expect(result).toEqual({ status: 'unauthenticated' })
    expect(logout).not.toHaveBeenCalled()
  })

  it('treats an inactive-user 403 session check as unauthenticated', async () => {
    const logout = vi.fn(async () => undefined)

    const result = await revalidateAdminSession({
      fetchUser: async () => {
        throw createHttpError(403)
      },
      logout,
    })

    expect(result).toEqual({ status: 'unauthenticated' })
    expect(logout).not.toHaveBeenCalled()
  })

  it('preserves the current state on an inconclusive session-check error', async () => {
    const logout = vi.fn(async () => undefined)

    const result = await revalidateAdminSession({
      fetchUser: async () => {
        throw new Error('Network unavailable')
      },
      logout,
    })

    expect(result).toEqual({ status: 'unchanged' })
    expect(logout).not.toHaveBeenCalled()
  })
})
