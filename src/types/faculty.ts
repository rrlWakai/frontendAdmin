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
  workload: FacultyWorkloadSummary
}

export type FacultyWorkloadStatus =
  | 'within_quota'
  | 'at_quota'
  | 'exceeds_quota'
  | 'not_configured'
  | 'no_current_term'
  | 'multiple_current_terms'
  | 'incomplete'

export interface FacultyWorkloadTerm {
  id: number
  academic_year: string
  term: string
  name: string
  status: string
  is_current: boolean
}

export interface FacultyWorkloadTermResolution {
  status: 'resolved' | 'missing' | 'multiple'
  message: string | null
  current_terms: FacultyWorkloadTerm[]
}

export interface FacultyWorkloadIssueOffering {
  id: number
  status: string
  subject: {
    id: number
    code: string
    title: string
    lecture_hours: string | null
    lab_hours: string | null
  }
  section: {
    id: number
    code: string
    name: string | null
  }
}

export interface FacultyWorkloadIssueProfessor {
  id: number
  name: string
}

export interface FacultyWorkloadIssue {
  code: string
  message: string
  offering?: FacultyWorkloadIssueOffering | null
  professors?: FacultyWorkloadIssueProfessor[]
}

export interface FacultyWorkloadSummary {
  academic_term: FacultyWorkloadTerm | null
  term_available: boolean
  term_resolution: FacultyWorkloadTermResolution
  weekly_quota: number | null
  assigned_hours: number
  scheduled_hours: number
  remaining_hours: number | null
  excess_hours: number | null
  utilization_percentage: number | null
  status: FacultyWorkloadStatus
  calculation_complete: boolean
  issues_count: number
  has_discrepancies: boolean
  unscheduled_offerings_count: number
}

export interface FacultyWorkloadOffering {
  offering_id: number
  offering_status: string
  subject: {
    id: number
    code: string
    title: string
    units: string
    lecture_hours: string
    lab_hours: string
  }
  section: {
    id: number
    code: string
    name: string | null
    program: { id: number; code: string; name: string }
    year_level: { id: number; level: number; name: string }
  }
  academic_term: FacultyWorkloadTerm
  required_weekly_hours: number
  scheduled_weekly_hours: number
  schedule_discrepancy_hours: number | null
  has_scheduled_meetings: boolean
  assignment_roles: string[]
}

export interface FacultyWorkloadDiscrepancy {
  offering_id: number
  subject_code: string
  subject_title: string
  section_code: string
  required_weekly_hours: number
  scheduled_weekly_hours: number
  difference_hours: number
}

export interface FacultyWorkload extends FacultyWorkloadSummary {
  issues: FacultyWorkloadIssue[]
  offerings: FacultyWorkloadOffering[]
  discrepancies: FacultyWorkloadDiscrepancy[]
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

export type FacultyDetail = Omit<FacultyDirectoryRecord, 'workload'> & {
  user_created_at: string | null
  availability: FacultyAvailabilityRecord[]
  assignments: FacultyAssignmentRecord[]
  workload: FacultyWorkload
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

export interface FacultyAvailabilityWindowInput {
  day_of_week: number
  start_time: string
  end_time: string
  availability_type: FacultyAvailabilityRecord['availability_type']
  notes: string | null
}

export interface FacultyAvailabilityBatchInput {
  academic_term_id: number
  windows: FacultyAvailabilityWindowInput[]
}

export interface OwnProfessorInput {
  employee_number?: string
  program_id?: number | null
  employment_type?: FacultyDirectoryRecord['employment_type']
  specialization?: string | null
}
