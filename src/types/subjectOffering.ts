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

export interface SubjectOfferingSection {
  id: number
  program_id: number
  year_level_id: number
  academic_term_id: number
  code: string
  name: string | null
  capacity: number | null
  status: string
  program?: SubjectOfferingProgram
  year_level?: SubjectOfferingYearLevel
}

export interface SubjectOfferingSubject {
  id: number
  code: string
  title: string
  units: string
  status: string
}

export interface SubjectOfferingFacultyAssignment {
  id: number
  assignment_role: string
  status: string
  professor: {
    id: number
    employee_number: string
    status: string
    user?: {
      id: number
      name: string
      status: string
    }
  }
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
}

export interface SubjectOfferingFilters {
  search?: string
  status?: SubjectOfferingStatus
  academic_term_id?: number
  section_id?: number
  subject_id?: number
  program_id?: number
  page?: number
  per_page?: number
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
