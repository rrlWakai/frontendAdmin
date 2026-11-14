import type { AccountStatus } from '@/types/users'

export interface FacultyProgram {
  id: number
  code: string
  name: string
  status: string
}

export interface FacultyTermOption {
  id: number
  academic_year: string
  term: string
  name: string
  status: string
}

export interface FacultyDirectoryRecord {
  id: number
  user_id: number
  name: string
  email: string
  account_status: AccountStatus
  employee_number: string | null
  employment_type: 'full_time' | 'part_time' | 'visiting'
  specialization: string | null
  profile_status: string
  created_at: string | null
  program: FacultyProgram | null
}

export interface FacultyAvailabilityRecord {
  id: number
  academic_term_id: number
  academic_term: {
    id: number
    academic_year: string
    term: string
    name: string
  }
  day_of_week: number
  start_time: string
  end_time: string
  availability_type: 'available' | 'unavailable' | 'preferred'
  notes: string | null
}

export interface FacultyAssignmentRecord {
  id: number
  assignment_role: string
  assigned_units: string | null
  status: string
  offering: {
    id: number
    status: string
    subject: { id: number; code: string; title: string; units: string }
    section: {
      id: number
      code: string
      name: string | null
      program: { id: number; code: string; name: string }
      year_level: { id: number; level: number; name: string }
    }
    academic_term: {
      id: number
      academic_year: string
      term: string
      name: string
    }
  }
}

export type FacultyDetail = FacultyDirectoryRecord & {
  user_created_at: string | null
  availability: FacultyAvailabilityRecord[]
  assignments: FacultyAssignmentRecord[]
}

export interface FacultyPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface FacultyDirectory {
  faculty: FacultyDirectoryRecord[]
  pagination: FacultyPagination
}

export interface FacultyFilters {
  search?: string
  status?: AccountStatus | ''
  page?: number
  per_page?: number
}

export interface FacultyAvailabilityInput {
  academic_term_id: number
  day_of_week: number
  start_time: string
  end_time: string
  availability_type: FacultyAvailabilityRecord['availability_type']
  notes: string | null
}

export interface OwnProfessorInput {
  employee_number?: string
  program_id?: number | null
  employment_type?: FacultyDirectoryRecord['employment_type']
  specialization?: string | null
}
