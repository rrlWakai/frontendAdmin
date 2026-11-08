import type { AcademicPagination } from '@/types/academic'

export type ScheduleStatus = 'draft' | 'published' | 'cancelled'
export type ScheduleModality = 'face_to_face' | 'online' | 'hybrid'
export type ScheduleType = 'lecture' | 'laboratory' | 'seminar' | 'other'

export interface SchedulingTerm {
  id: number
  academic_year: string
  term: string
  name: string
  status: string
  is_current: boolean
}

export interface SchedulingOffering {
  id: number
  expected_students: number | null
  subject: { id: number; code: string; title: string }
  section: {
    id: number
    code: string
    name: string | null
    program: { id: number; code: string; name: string }
    year_level: { id: number; name: string }
  }
}

export interface SchedulingProfessor {
  id: number
  name: string
  employee_number: string
}

export interface SchedulingRoom {
  id: number
  code: string
  name: string
  building: string | null
  capacity: number
  room_type: string
  status: string
}

export interface SchedulingOptions {
  terms: SchedulingTerm[]
  offerings: SchedulingOffering[]
  programs: Array<{ id: number; code: string; name: string }>
  sections: Array<{ id: number; code: string; name: string | null; program_id: number; academic_term_id: number }>
  subjects: Array<{ id: number; code: string; title: string }>
  professors: SchedulingProfessor[]
  rooms: SchedulingRoom[]
}

export interface ScheduleAssignment {
  id: number
  faculty_assignment_id: number
  is_primary: boolean
  status: string
  assignment_role: string
  professor: { id: number; name: string }
}

export interface ScheduleRoomAllocation {
  id: number
  room_id: number
  status: string
  room: {
    id: number
    code: string
    name: string
    building: string | null
    capacity: number
  }
}

export interface ScheduleRecord {
  id: number
  subject_offering_id: number
  day_of_week: number
  start_time: string
  end_time: string
  schedule_type: ScheduleType
  modality: ScheduleModality
  status: ScheduleStatus
  offering: SchedulingOffering & {
    academic_term: {
      id: number
      academic_year: string
      term: string
      name: string
      starts_on: string
      ends_on: string
    }
  }
  assignments: ScheduleAssignment[]
  room_allocations: ScheduleRoomAllocation[]
}

export interface ScheduleFilters {
  academic_term_id: number
  search?: string
  status?: ScheduleStatus | ''
  section_id?: number
  program_id?: number
  subject_id?: number
  professor_id?: number
  room_id?: number
  day_of_week?: number
  page?: number
  per_page?: number
}

export interface ScheduleDirectory {
  schedules: ScheduleRecord[]
  pagination: AcademicPagination
}

export interface FacultyAssignmentOption {
  id: number
  professor_id: number
  subject_offering_id: number
  assignment_role: string
  assigned_units: string | null
  status: string
  professor: { id: number; name: string; employee_number: string }
}

export interface ScheduleConflictRecord {
  id: number
  academic_term_id: number
  conflict_type: 'room' | 'faculty' | 'section'
  status: 'open' | 'resolved' | 'waived'
  detected_at: string
  resolution_notes: string | null
  resource: string | null
  schedules: Array<{
    id: number
    day_of_week: number
    start_time: string
    end_time: string
    status: ScheduleStatus
    subject_code: string
    subject_title: string
    section_code: string
  }>
}

export interface ScheduleConflictPreview {
  schedule_id: number
  conflict_type: 'room' | 'faculty' | 'section'
  message: string
}

export interface FacultyAssignmentInput {
  professor_id: number
  subject_offering_id: number
  assignment_role: string
}

export interface ScheduleInput {
  subject_offering_id: number
  day_of_week: number
  start_time: string
  end_time: string
  schedule_type: ScheduleType
  modality: ScheduleModality
}

export interface SchedulePagination {
  schedules: ScheduleRecord[]
  pagination: AcademicPagination
}
