export type AdminRole = 'administrator' | 'department_personnel'

export type AuthRole = AdminRole | 'professor' | 'student'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: AuthRole | null
  roleLabel: string | null
  status: string
  profile: null
}

export interface AuthSession {
  user: AuthUser
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'unauthorized'
  | 'error'

export function isAdminRole(role: AuthRole | null): role is AdminRole {
  return role === 'administrator' || role === 'department_personnel'
}
