import type { AcademicPagination } from '@/types/academic'

export interface StudentScheduleConflictOptions {
  terms: Array<{
    id: number
    academic_year: string
    term: string
    name: string
    status: string
    is_current: boolean
  }>
  selected_term: StudentScheduleConflictTerm | null
  programs: Array<{ id: number; code: string; name: string }>
  year_levels: Array<{ id: number; level: number; name: string }>
  sections: Array<{
    id: number
    code: string
    name: string | null
    program_id: number
    year_level_id: number
  }>
}

export interface StudentScheduleConflictTerm {
  id: number
  academic_year: string
  term: string
  name: string
  starts_on: string | null
  ends_on: string | null
}

export interface StudentScheduleConflictClass {
  schedule_id: number
  subject_offering_id: number
  subject: { id: number; code: string; title: string }
  section: {
    id: number
    code: string
    name: string | null
    program: { id: number; code: string; name: string } | null
    year_level: { id: number; level: number; name: string } | null
  }
  start_time: string
  end_time: string
  room: { id: number; code: string; name: string; building: string | null } | null
  professors: Array<{ id: number; name: string }>
}

export interface StudentScheduleConflict {
  id: string
  student: {
    id: number
    name: string | null
    student_number: string
    program: { id: number; code: string; name: string } | null
    year_levels: Array<{ id: number; level: number; name: string }>
  }
  academic_term: StudentScheduleConflictTerm
  day_of_week: number
  day_label: string
  overlap: { start_time: string; end_time: string }
  classes: [StudentScheduleConflictClass, StudentScheduleConflictClass]
}

export interface StudentScheduleConflictFilters {
  academic_term_id?: number
  program_id?: number
  year_level_id?: number
  section_id?: number
  search?: string
  page?: number
  per_page?: number
}

export interface StudentScheduleConflictPage {
  academic_term: StudentScheduleConflictTerm | null
  summary: {
    students_checked: number
    students_with_conflicts: number
    conflict_pairs: number
  }
  conflicts: StudentScheduleConflict[]
  pagination: AcademicPagination
}
