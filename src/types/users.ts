export type ManagedRole =
  | 'administrator'
  | 'department_personnel'
  | 'professor'
  | 'student'

export type AccountStatus = 'active' | 'inactive' | 'suspended'

export interface ProgramOption {
  id: number
  code: string
  name: string
  status: string
}

export interface RoleOption {
  code: ManagedRole
  name: string
}

export interface StudentAccountProfile {
  type: 'student'
  student_number: string
  program: ProgramOption | null
  admitted_on: string | null
}

export interface ProfessorAccountProfile {
  type: 'professor'
  employee_number: string
  employment_type: 'full_time' | 'part_time' | 'visiting'
  specialization: string | null
  program: ProgramOption | null
}

export type AccountProfile = StudentAccountProfile | ProfessorAccountProfile | null

export interface ManagedUser {
  id: number
  name: string
  email: string
  role: RoleOption
  status: AccountStatus
  last_login_at: string | null
  profile: AccountProfile
  program_access: ProgramOption[]
}

export interface UserPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface UserDirectory {
  users: ManagedUser[]
  pagination: UserPagination
}

export interface UserOptions {
  roles: RoleOption[]
  programs: ProgramOption[]
}

export interface AccountProfileInput {
  student_number?: string
  employee_number?: string
  program_id: number | null
  admitted_on?: string | null
  employment_type?: 'full_time' | 'part_time' | 'visiting'
  specialization?: string | null
}

export interface AccountFormSubmission {
  name: string
  email: string
  password?: string
  password_confirmation?: string
  role?: ManagedRole
  profile?: AccountProfileInput
}

export type CreateUserInput = AccountFormSubmission & {
  password: string
  password_confirmation: string
  role: ManagedRole
}

export type UpdateUserInput = Omit<AccountFormSubmission, 'role'>
