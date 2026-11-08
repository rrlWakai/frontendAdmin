export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type AttendanceSessionStatus = 'open' | 'submitted' | 'cancelled'

export interface AttendanceOption {
  id: number
  code: string
  name: string
}

export interface AttendanceOptions {
  programs: AttendanceOption[]
  terms: Array<{
    id: number
    academic_year: string
    term: string
    name: string
  }>
  sections: Array<{
    id: number
    program_id: number
    academic_term_id: number
    code: string
    name: string | null
  }>
  subjects: Array<{ id: number; code: string; title: string }>
  professors: Array<{ id: number; name: string }>
}

export interface AttendanceSession {
  id: number
  class_date: string
  status: AttendanceSessionStatus
  created_by_user_id: number | null
  submitted_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  record_count?: number
  schedule: {
    id: number
    day_of_week: number
    start_time: string
    end_time: string
    status: string
  }
  offering: {
    id: number
    subject: { id: number; code: string; title: string }
    section: {
      id: number
      code: string
      name: string | null
      program: { id: number; code: string; name: string }
    }
    academic_term: {
      id: number
      academic_year: string
      term: string
      name: string
    }
  }
  professors: Array<{ id: number; name: string }>
}

export interface AttendanceRecord {
  id: number
  student_subject_enrollment_id: number
  status: AttendanceStatus
  check_in_at: string | null
  remarks: string | null
  recorded_by_user_id: number | null
  updated_by_user_id: number | null
  student: {
    id: number
    student_number: string
    name: string
  }
  changes?: Array<{
    previous_status: AttendanceStatus
    new_status: AttendanceStatus
    previous_check_in_at: string | null
    new_check_in_at: string | null
    previous_remarks: string | null
    new_remarks: string | null
    correction_reason: string
    changed_by: string | null
    changed_at: string | null
  }>
}

export interface AttendanceRosterEntry {
  student_subject_enrollment_id: number
  student: {
    id: number
    student_number: string
    name: string
  }
  attendance: AttendanceRecord | null
}

export interface AttendanceSessionDetail {
  session: AttendanceSession
  roster: AttendanceRosterEntry[]
}

export interface AttendanceRecordItem {
  attendance: AttendanceRecord
  session: AttendanceSession
}

export interface AttendancePagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  excused: number
  total: number
}

export interface AttendanceFilters {
  search?: string
  academic_term_id?: number
  program_id?: number
  section_id?: number
  subject_id?: number
  professor_id?: number
  status?: string
  from_date?: string
  to_date?: string
  page?: number
  per_page?: number
}
