export type AcademicResource = 'programs' | 'terms' | 'year-levels' | 'subjects' | 'sections'

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

export interface AcademicTerm extends AcademicRecord {
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
  code: string
  name: string | null
  capacity: number | null
  status: 'active' | 'inactive' | 'archived'
  program: { id: number; code: string; name: string }
  year_level: { id: number; level: number; name: string }
  academic_term: { id: number; academic_year: string; term: string; name: string }
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

export interface AcademicPagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AcademicOptions {
  programs: Array<{ id: number; code: string; name: string; status: string }>
  year_levels: AcademicYearLevel[]
  terms: Array<{
    id: number
    academic_year: string
    term: string
    name: string
    status: string
    is_current: boolean
  }>
}
