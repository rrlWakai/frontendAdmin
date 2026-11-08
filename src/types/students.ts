import type { AccountStatus } from '@/types/users'

export interface StudentProgram {
  id: number
  code: string
  name: string
  status: string
}

export interface StudentDirectoryRecord {
  id: number
  user_id: number
  student_number: string
  name: string
  email: string
  account_status: AccountStatus
  profile_status: string
  admitted_on: string | null
  created_at: string | null
  program: StudentProgram | null
}

export interface StudentOffering {
  id: number
  status: string
  expected_students: number | null
  subject: {
    id: number
    code: string
    title: string
    units: string
  }
  academic_term: {
    id: number
    academic_year: string
    term: string
    name: string
  }
  section: {
    id: number
    code: string
    name: string | null
    program: { id: number; code: string; name: string }
    year_level: { id: number; level: number; name: string }
  }
}

export interface StudentEnrollment {
  id: number
  status: 'enrolled' | 'dropped' | 'completed' | 'incomplete'
  enrolled_at: string | null
  dropped_at: string | null
  subject_offering: StudentOffering
}

export type StudentDetail = Omit<StudentDirectoryRecord, 'email'> & {
  email?: string
  enrollments: StudentEnrollment[]
}

export interface StudentPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface StudentDirectory {
  students: StudentDirectoryRecord[]
  pagination: StudentPagination
}

export interface StudentFilters {
  search?: string
  status?: AccountStatus | ''
  program_id?: number
  page?: number
  per_page?: number
}
