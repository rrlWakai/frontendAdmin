export type AcademicResource =
  | 'programs'
  | 'terms'
  | 'year-levels'
  | 'subjects'
  | 'sections'
  | 'academic-years'
  | 'majors'
  | 'curriculum-requirements'
  | 'major-selection-periods'

export interface AcademicRecord {
  id: number
  [key: string]: unknown
}

export interface AcademicProgram extends AcademicRecord {
  code: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
}

export interface AcademicYear extends AcademicRecord {
  label: string
  starts_on: string
  ends_on: string
  status: 'planned' | 'active' | 'completed' | 'archived'
}

export interface AcademicMajor extends AcademicRecord {
  program_id: number
  code: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  program?: { id: number; code: string; name: string; status: string }
}

export interface AcademicTerm extends AcademicRecord {
  academic_year_id: number | null
  academic_year: string
  term: 'first' | 'second' | 'summer'
  name: string
  starts_on: string
  ends_on: string
  is_current: boolean
  status: 'planned' | 'active' | 'completed' | 'archived'
}

export interface AcademicYearLevel extends AcademicRecord {
  level: number
  name: string
}

export interface AcademicSection extends AcademicRecord {
  program_id: number
  year_level_id: number
  academic_term_id: number
  major_id: number | null
  code: string
  name: string | null
  capacity: number | null
  status: 'active' | 'inactive' | 'archived'
  program: { id: number; code: string; name: string }
  year_level: { id: number; level: number; name: string }
  academic_term: { id: number; academic_year: string; term: string; name: string }
  major?: { id: number; code: string; name: string } | null
}

export interface AcademicSubject extends AcademicRecord {
  code: string
  title: string
  description: string | null
  units: string
  lecture_hours: string
  lab_hours: string
  status: 'active' | 'inactive'
}

export interface AcademicCurriculumRequirement extends AcademicRecord {
  program_id: number
  year_level_id: number
  major_id: number | null
  subject_id: number
  requirement_type: 'core' | 'minor' | 'major' | 'elective'
  status: 'active' | 'inactive'
  program: { id: number; code: string; name: string }
  year_level: { id: number; level: number; name: string }
  major: { id: number; code: string; name: string } | null
  subject: { id: number; code: string; title: string; units: string; status: string }
}

export interface AcademicMajorSelectionPeriod extends AcademicRecord {
  academic_year_id: number
  program_id: number
  target_year_level_id: number
  opens_at: string
  closes_at: string
  allow_changes: boolean
  status: 'planned' | 'active' | 'closed' | 'archived'
  academic_year: { id: number; label: string; status: string }
  program: { id: number; code: string; name: string; status: string }
  target_year_level: { id: number; level: number; name: string }
}

export interface AcademicMajorSelection extends AcademicRecord {
  student_id: number
  academic_year_id: number
  program_id: number
  major_id: number
  period_id: number | null
  status: 'submitted' | 'approved' | 'rejected'
  selected_at: string | null
  reviewed_at: string | null
  remarks: string | null
  student: {
    id: number
    student_number: string
    program_id: number
    user: { id: number; name: string; email: string; status: string } | null
  }
  major: { id: number; program_id: number; code: string; name: string } | null
  academic_year: { id: number; label: string; status: string } | null
  period: {
    id: number
    opens_at: string | null
    closes_at: string | null
    allow_changes: boolean
    status: string
  } | null
  reviewer: { id: number; name: string } | null
}

export interface PromotionRunItem {
  id: number
  student_id: number
  status: 'pending' | 'ready' | 'exception' | 'promoted'
  exception_code: string | null
  exception_message: string | null
  from_year_level_id: number | null
  to_year_level_id: number | null
  major_id: number | null
  section_id: number | null
  student: {
    id: number
    student_number: string
    program_id: number
    user: { id: number; name: string; email: string } | null
  }
  from_year_level: { id: number; level: number; name: string } | null
  to_year_level: { id: number; level: number; name: string } | null
  major: { id: number; code: string; name: string } | null
  section: { id: number; code: string; name: string | null } | null
}

export interface PromotionRun {
  id: number
  source_academic_year_id: number
  target_academic_year_id: number
  source_term_id: number
  target_term_id: number
  status: 'prepared' | 'allocated' | 'finalized'
  prepared_at: string | null
  finalized_at: string | null
  notes: string | null
  source_academic_year: { id: number; label: string } | null
  target_academic_year: { id: number; label: string } | null
  source_term: { id: number; name: string; term: string } | null
  target_term: { id: number; name: string; term: string } | null
  items: PromotionRunItem[]
  promoted_count?: number
}

export interface DuePromotion {
  academic_year_id: number
  academic_year: string | null
  source_term_id: number
  source_term: string
  ends_on: string | null
  status: string
  promotion_run_id: number | null
}

export interface PromotionAllocationGroup {
  program_id: number
  year_level_id: number
  major_id: number | null
  student_count: number
  required_sections: number
  existing_sections: number
  shortage_sections: number
  shortage_seats: number
}

export interface PromotionAllocation {
  groups: PromotionAllocationGroup[]
  totals: {
    students: number
    required_sections: number
    existing_sections: number
    shortage_sections: number
    shortage_seats: number
  }
}

export interface AcademicPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AcademicOptions {
  programs: Array<{ id: number; code: string; name: string; status: string }>
  year_levels: AcademicYearLevel[]
  academic_years: Array<{
    id: number
    label: string
    starts_on: string
    ends_on: string
    status: string
  }>
  majors: Array<{
    id: number
    program_id: number
    code: string
    name: string
    description: string | null
    status: string
  }>
  terms: Array<{
    id: number
    academic_year_id: number | null
    academic_year: string
    term: string
    name: string
    status: string
    is_current: boolean
  }>
  subjects: Array<{
    id: number
    code: string
    title: string
    units: string
    status: string
  }>
}
