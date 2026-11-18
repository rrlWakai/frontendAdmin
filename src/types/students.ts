import type { AccountStatus } from '@/types/users'

export interface StudentProgram {
  id: number
  code: string
  name: string
  status: string
}

export interface StudentPlacement {
  id: number
  status: string
  is_current: boolean
  effective_on: string | null
  ends_on: string | null
  academic_year: { id: number; label: string } | null
  academic_term: {
    id: number
    academic_year: string
    term: string
    name: string
  } | null
  year_level: { id: number; level: number; name: string } | null
  major: { id: number; code: string; name: string } | null
  section: { id: number; code: string; name: string | null } | null
}

export interface StudentMajorSelectionSummary {
  id: number
  status: string
  selected_at: string | null
  reviewed_at: string | null
  remarks: string | null
  major: { id: number; code: string; name: string } | null
  academic_year: { id: number; label: string } | null
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
  current_placement: StudentPlacement | null
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
  placements: StudentPlacement[]
  major_selections: StudentMajorSelectionSummary[]
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
  year_level_id?: number
  major_id?: number
  section_id?: number
  page?: number
  per_page?: number
}

export interface StudentLogsPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface StudentActivityLogEntry {
  id: number
  action: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  student: {
    id: number
    student_number: string
    name: string | null
    status: string
  }
  actor: {
    id: number
    name: string
  } | null
}

export interface StudentActivityLogDirectory {
  logs: StudentActivityLogEntry[]
  pagination: StudentLogsPagination
}

export interface StudentAcademicHistoryRecord {
  id: number
  status: string
  is_current: boolean
  effective_on: string | null
  ends_on: string | null
  removal_pending: boolean
  student: {
    id: number
    user_id: number
    student_number: string
    name: string | null
    status: string
  }
  academic_year: { id: number; label: string } | null
  academic_term: {
    id: number
    academic_year: string
    term: string
    name: string
  } | null
  program: { id: number; code: string; name: string } | null
  year_level: { id: number; level: number; name: string } | null
  major: { id: number; code: string; name: string } | null
  section: { id: number; code: string; name: string | null } | null
}

export interface StudentAcademicHistoryDirectory {
  records: StudentAcademicHistoryRecord[]
  pagination: StudentLogsPagination
}

export interface RemovedStudentRecord {
  id: number
  status: string
  removed_at: string | null
  restore_deadline: string | null
  remaining_seconds: number
  restored_at: string | null
  student: {
    id: number
    user_id: number
    student_number: string
    name: string | null
    status: string
  }
  removed_by: { id: number; name: string } | null
  restored_by: { id: number; name: string } | null
}

export interface RemovedStudentDirectory {
  server_time: string
  removals: RemovedStudentRecord[]
  pagination: StudentLogsPagination
}
