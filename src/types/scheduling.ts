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

export type SchedulingReadinessSeverity = 'blocking' | 'warning' | 'info'
export type SchedulingReadinessLayer = 'integration' | 'generation_data' | 'lifecycle'

export interface SchedulingReadinessIssue {
  severity: SchedulingReadinessSeverity
  code: string
  category: string
  message: string
  entity_type: string | null
  entity_id: string | null
  related_ids: string[]
  layer: SchedulingReadinessLayer
}

export interface SchedulingReadinessLayerSummary {
  ready: boolean
  blocking_count: number
  warning_count: number
  info_count: number
  issues: SchedulingReadinessIssue[]
}

export interface SchedulingReadiness {
  academic_term: {
    id: string
    academic_year: string
    term: string
    name: string
    status: string
    starts_on: string | null
    ends_on: string | null
  }
  ready: boolean
  integration_ready: boolean
  generation_data_ready: boolean
  lifecycle_ready: boolean
  generation_available: boolean
  blocking_count: number
  warning_count: number
  info_count: number
  counts: {
    offerings: number
    programs: number
    year_levels: number
    sections: number
    assigned_professors: number
    available_rooms: number
    published_schedules: number
    draft_schedules: number
    open_conflicts: number
  }
  issues: SchedulingReadinessIssue[]
  layers: Record<SchedulingReadinessLayer, SchedulingReadinessLayerSummary>
  capabilities: Record<string, boolean>
  inspected_at: string
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

export type SchedulerSolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN'
export type SchedulerValidationStatus = 'passed' | 'failed' | 'not_run'

export interface SchedulerProfessorAssignment {
  subject_offering_id: string
  faculty_assignment_id: string
  assignment_role: string
}

export interface SchedulerAssignment {
  meeting_instance_id: string
  source_requirement_id: string
  occurrence_number: number
  subject_offering_ids: string[]
  section_ids: string[]
  professor_id: string
  professor_assignments: SchedulerProfessorAssignment[]
  is_primary: boolean
  room_id: string | null
  meeting_type: ScheduleType
  modality: ScheduleModality
  day_of_week: number
  start_time: string
  end_time: string
  duration_minutes: number
}

export interface SchedulerDiagnostic {
  code: string
  message: string
  evidence: string
  meeting_requirement_ids: string[]
  related_entity_ids: string[]
}

export interface SchedulerWarning {
  code: string
  message: string
  related_entity_ids?: string[] | null
}

export interface SchedulerWorkloadMetric {
  professor_id: string
  employment_type: string
  assigned_teaching_minutes: number
  weekly_target_minutes: number | null
  signed_target_deviation_minutes: number | null
  absolute_target_deviation_minutes: number | null
}

export interface SchedulerValidationSummary {
  independent_validation_status: SchedulerValidationStatus
  scheduled_meeting_count: number
  required_mandatory_meeting_count: number
  desired_meeting_count: number
  required_offering_count: number
  represented_offering_count: number
  complete_candidate: boolean
  validation_errors: string[]
}

export interface SchedulerPlacementMetrics {
  comparable_meeting_count: number
  retained_placement_count: number
  changed_placement_count: number
  unmatched_baseline_schedule_count: number
}

export interface SchedulerFullTimeDistribution {
  minimum_assigned_minutes: number
  maximum_assigned_minutes: number
  spread_minutes: number
}

export interface SchedulingSolveResult {
  contract_version: string
  generation_id: string
  snapshot_sha256: string
  correlation_id: string
  solver_status: SchedulerSolverStatus
  started_at: string
  completed_at: string
  solver_execution_ms: number
  objective_value?: number | null
  best_bound?: number | null
  optimality_proven: boolean
  time_limit_reached: boolean
  assignments: SchedulerAssignment[]
  validation_summary: SchedulerValidationSummary
  full_time_distribution?: SchedulerFullTimeDistribution | null
  placement_metrics: SchedulerPlacementMetrics
  unscheduled_mandatory_meeting_ids?: string[] | null
  diagnostics: SchedulerDiagnostic[]
  workload_metrics: SchedulerWorkloadMetric[]
  warnings: SchedulerWarning[]
}

export interface SchedulingSolveInput {
  academic_term_id: number
  correlation_id?: string
}

export type SchedulingConfigurationStatus = 'draft' | 'approved' | 'superseded'

export interface SchedulingTimeGridSlot {
  id: number
  start_time: string
  end_time: string
  label: string | null
}

export interface SchedulingTimeGridDay {
  id: number
  day_of_week: number
  operating_start: string
  operating_end: string
  slots: SchedulingTimeGridSlot[]
}

export interface SchedulingTimeGrid {
  id: number
  academic_term_id: number
  version: number
  status: SchedulingConfigurationStatus
  timezone: string
  approved_at: string | null
  approved_by: { id: number; name: string } | null
  notes: string | null
  days: SchedulingTimeGridDay[]
  created_at: string | null
  updated_at: string | null
}

export interface SchedulingTimeGridIndex {
  current: SchedulingTimeGrid | null
  history: SchedulingTimeGrid[]
}

export interface SchedulingTimeGridDayInput {
  day_of_week: number
  operating_start: string
  operating_end: string
  slots: Array<{ start_time: string; end_time: string; label?: string | null }>
}

export interface SchedulingTimeGridInput {
  academic_term_id?: number
  timezone: string
  notes?: string | null
  days: SchedulingTimeGridDayInput[]
}

export interface SchedulingMeetingRequirement {
  id: number
  meeting_type: ScheduleType
  frequency_per_week: number
  duration_minutes: number
  modality: ScheduleModality
  required_room_type: string | null
  mandatory: boolean
  allowed_days: number[] | null
  valid_start_times: string[] | null
}

export interface SchedulingMeetingPlan {
  id: number
  academic_term_id: number
  subject_offering_id: number
  version: number
  status: SchedulingConfigurationStatus
  approved_at: string | null
  approved_by: { id: number; name: string } | null
  notes: string | null
  requirements: SchedulingMeetingRequirement[]
  created_at: string | null
  updated_at: string | null
}

export interface SchedulingConfigurationOffering {
  id: number
  section_id: number
  subject_id: number
  expected_students: number | null
  subject: {
    id: number
    code: string
    title: string
    lecture_hours: number | null
    lab_hours: number | null
  } | null
  section: { id: number; code: string; name: string | null } | null
}

export interface SchedulingMeetingPlanEntry {
  offering: SchedulingConfigurationOffering
  current: SchedulingMeetingPlan | null
  history: SchedulingMeetingPlan[]
}

export interface SchedulingMeetingPlanIndex {
  plans: SchedulingMeetingPlanEntry[]
  offerings: SchedulingConfigurationOffering[]
}

export interface SchedulingMeetingRequirementInput {
  meeting_type: ScheduleType
  frequency_per_week: number
  duration_minutes: number
  modality: ScheduleModality
  required_room_type?: string | null
  mandatory: boolean
  allowed_days?: number[] | null
  valid_start_times?: string[] | null
}

export interface SchedulingMeetingPlanInput {
  subject_offering_id: number
  notes?: string | null
  requirements: SchedulingMeetingRequirementInput[]
}
