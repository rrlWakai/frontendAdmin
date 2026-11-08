import { isAxiosError } from 'axios'
import { isAdminRole } from '@/types/auth'
import type { AuthUser } from '@/types/auth'

export type AdminSessionRevalidation =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthorized' }
  | { status: 'unauthenticated' }
  | { status: 'unchanged' }

interface RevalidateAdminSessionOptions {
  fetchUser: () => Promise<AuthUser>
  logout: () => Promise<void>
}

export async function revalidateAdminSession({
  fetchUser,
  logout,
}: RevalidateAdminSessionOptions): Promise<AdminSessionRevalidation> {
  try {
    const user = await fetchUser()

    if (isAdminRole(user.role)) {
      return { status: 'authenticated', user }
    }

    await logout().catch(() => undefined)

    return { status: 'unauthorized' }
  } catch (error) {
    if (
      isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      return { status: 'unauthenticated' }
    }

    return { status: 'unchanged' }
  }
}
