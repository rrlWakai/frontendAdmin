import type { AcademicPagination } from '@/types/academic'

export type SubjectOfferingStatus = 'draft' | 'open' | 'closed' | 'cancelled'

export interface SubjectOfferingTerm {
  id: number
  academic_year: string
  term: string
  name: string
  status: string
  is_current: boolean
}

export interface SubjectOfferingProgram {
  id: number
  code: string
  name: string
  status: string
}

export interface SubjectOfferingYearLevel {
  id: number
  level: number
  name: string
}

export interface SubjectOfferingMajor {
  id: number
  program_id: number
  code: string
  name: string
}

export interface SubjectOfferingSection {
  id: number
  program_id: number
  year_level_id: number
  major_id: number | null
  academic_term_id: number
  code: string
  name: string | null
  capacity: number | null
  status: string
  program?: SubjectOfferingProgram
  year_level?: SubjectOfferingYearLevel
  major?: SubjectOfferingMajor | null
}

export interface SubjectOfferingSubject {
  id: number
  code: string
  title: string
  units: string
  status: string
}

export interface SubjectOfferingProfessor {
  id: number
  employee_number: string
  status: string
  user?: {
    id: number
    name: string
    status: string
  }
}

export interface SubjectOfferingFacultyAssignment {
  id: number
  assignment_role: string
  status: string
  professor: SubjectOfferingProfessor
}

export interface SubjectOfferingRoomAllocation {
  id: number
  room_id: number
  class_schedule_id: number
  status: string
  room: {
    id: number
    code: string
    name: string
    capacity: number
  }
}

export interface SubjectOfferingSchedule {
  id: number
  day_of_week: number
  start_time: string
  end_time: string
  schedule_type: string
  modality: string
  status: string
  room_allocations: SubjectOfferingRoomAllocation[]
}

export interface SubjectOffering {
  id: number
  academic_term_id: number
  section_id: number
  subject_id: number
  expected_students: number | null
  status: SubjectOfferingStatus
  academic_term: SubjectOfferingTerm
  section: SubjectOfferingSection
  subject: SubjectOfferingSubject
  enrolled_students_count?: number
  active_faculty_assignments_count?: number
  published_schedules_count?: number
  faculty_assignments?: SubjectOfferingFacultyAssignment[]
  class_schedules?: SubjectOfferingSchedule[]
  created_at?: string
  updated_at?: string
}

export interface SubjectOfferingDetail extends SubjectOffering {
  enrolled_students_count: number
  active_faculty_assignments_count: number
  published_schedules_count: number
  faculty_assignments: SubjectOfferingFacultyAssignment[]
  class_schedules: SubjectOfferingSchedule[]
}

export interface SubjectOfferingOptions {
  terms: SubjectOfferingTerm[]
  programs: SubjectOfferingProgram[]
  sections: SubjectOfferingSection[]
  subjects: SubjectOfferingSubject[]
  professors: SubjectOfferingProfessor[]
}

export type SubjectOfferingAssignmentFilter = 'assigned' | 'incomplete'

export interface SubjectOfferingFilters {
  search?: string
  status?: SubjectOfferingStatus
  assignment_status?: SubjectOfferingAssignmentFilter
  academic_term_id?: number
  section_id?: number
  subject_id?: number
  program_id?: number
  year_level_id?: number
  page?: number
  per_page?: number
}

export interface SubjectOfferingSummary {
  total: number
  assigned: number
  incomplete: number
}

export type SubjectOfferingPreparationSeverity = 'blocking' | 'warning'

export interface SubjectOfferingPreparationDiagnostic {
  code: string
  message: string
  severity: SubjectOfferingPreparationSeverity
  section_id: number | null
  section_code: string | null
  program_code: string | null
  year_level: number | null
  major_code: string | null
}

export interface SubjectOfferingPreparationClass {
  section_id: number
  section_code: string
  program_id: number
  program_code: string
  year_level_id: number
  year_level: number
  major_id: number | null
  major_code: string | null
  subject_id: number
  subject_code: string
  subject_title: string
  exists: boolean
  offering_id: number | null
  offering_status: SubjectOfferingStatus | null
}

export interface SubjectOfferingPreparationSummary {
  required: number
  existing: number
  missing: number
  sections: number
  sections_with_issues: number
  issues: number
  warnings: number
}

export interface SubjectOfferingPreparationPlan {
  academic_term: SubjectOfferingTerm
  summary: SubjectOfferingPreparationSummary
  classes: SubjectOfferingPreparationClass[]
  issues: SubjectOfferingPreparationDiagnostic[]
  warnings: SubjectOfferingPreparationDiagnostic[]
}

export interface SubjectOfferingPreparationResult {
  created_count: number
  preparation: SubjectOfferingPreparationPlan
}

export interface CurriculumSubjectFilters {
  program_id: number
  year_level_id: number
  semester?: string
  classification?: 'common' | 'major'
  major_id?: number
}

export type SubjectOfferingPagination = AcademicPagination

export interface SubjectOfferingInput {
  academic_term_id: number
  section_id: number
  subject_id: number
  expected_students: number | null
}

export type SubjectOfferingUpdateInput = Partial<SubjectOfferingInput>

export interface SubjectOfferingStatusInput {
  status: Extract<SubjectOfferingStatus, 'open' | 'closed'>
}
