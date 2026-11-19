import type { ApiSuccessResponse } from '@/types/api'
import type {
  FacultyAssignmentInput,
  FacultyAssignmentOption,
  ScheduleConflictPreview,
  ScheduleConflictRecord,
  ScheduleDirectory,
  ScheduleFilters,
  ScheduleInput,
  ScheduleRecord,
  SchedulingMeetingPlan,
  SchedulingMeetingPlanIndex,
  SchedulingMeetingPlanInput,
  SchedulingOptions,
  SchedulingReadiness,
  SchedulingSolveInput,
  SchedulingSolveResult,
  SchedulingTimeGrid,
  SchedulingTimeGridIndex,
  SchedulingTimeGridInput,
} from '@/types/scheduling'
import { apiClient } from '@/services/api/client'

export async function fetchSchedulingOptions(termId: number): Promise<SchedulingOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<SchedulingOptions>>('/scheduling/options', {
    params: { academic_term_id: termId },
  })

  return data.data
}

export async function fetchSchedulingReadiness(termId: number): Promise<SchedulingReadiness> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ readiness: SchedulingReadiness }>>(
    '/scheduling/readiness',
    { params: { academic_term_id: termId } },
  )

  return data.data.readiness
}

export async function solveScheduling(input: SchedulingSolveInput): Promise<SchedulingSolveResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ result: SchedulingSolveResult }>>(
    '/scheduling/solve',
    input,
  )

  return data.data.result
}

export async function fetchSchedules(filters: ScheduleFilters): Promise<ScheduleDirectory> {  const { data } = await apiClient.get<ApiSuccessResponse<ScheduleDirectory>>('/schedules', {
    params: filters,
  })

  return data.data
}

export async function fetchOfferingFacultyAssignments(
  offeringId: number,
): Promise<FacultyAssignmentOption[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ assignments: FacultyAssignmentOption[] }>>(
    '/faculty-assignments',
    { params: { subject_offering_id: offeringId } },
  )

  return data.data.assignments
}

export async function createFacultyAssignment(
  input: FacultyAssignmentInput,
): Promise<FacultyAssignmentOption> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ assignment: FacultyAssignmentOption }>>(
    '/faculty-assignments',
    input,
  )

  return data.data.assignment
}

export async function updateFacultyAssignmentStatus(
  assignmentId: number,
  status: 'completed' | 'cancelled',
): Promise<FacultyAssignmentOption> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ assignment: FacultyAssignmentOption }>>(
    `/faculty-assignments/${assignmentId}/status`,
    { status },
  )

  return data.data.assignment
}

export async function createSchedule(input: ScheduleInput): Promise<ScheduleRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ schedule: ScheduleRecord }>>(
    '/schedules',
    input,
  )

  return data.data.schedule
}

export async function updateSchedule(
  scheduleId: number,
  input: Partial<Omit<ScheduleInput, 'subject_offering_id'>>,
): Promise<ScheduleRecord> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ schedule: ScheduleRecord }>>(
    `/schedules/${scheduleId}`,
    input,
  )

  return data.data.schedule
}

export async function assignFacultyToSchedule(
  scheduleId: number,
  facultyAssignmentId: number,
  isPrimary: boolean,
): Promise<ScheduleRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ schedule: ScheduleRecord }>>(
    `/schedules/${scheduleId}/assignments`,
    { faculty_assignment_id: facultyAssignmentId, is_primary: isPrimary },
  )

  return data.data.schedule
}

export async function cancelScheduleAssignment(
  scheduleId: number,
  assignmentId: number,
): Promise<void> {
  await apiClient.post(`/schedules/${scheduleId}/assignments/${assignmentId}/cancel`)
}

export async function allocateScheduleRoom(scheduleId: number, roomId: number): Promise<ScheduleRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ schedule: ScheduleRecord }>>(
    `/schedules/${scheduleId}/room-allocations`,
    { room_id: roomId },
  )

  return data.data.schedule
}

export async function releaseScheduleRoom(scheduleId: number, allocationId: number): Promise<void> {
  await apiClient.post(`/schedules/${scheduleId}/room-allocations/${allocationId}/release`)
}

export async function publishSchedule(scheduleId: number): Promise<ScheduleRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ schedule: ScheduleRecord }>>(
    `/schedules/${scheduleId}/publish`,
  )

  return data.data.schedule
}

export async function cancelSchedule(scheduleId: number): Promise<ScheduleRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ schedule: ScheduleRecord }>>(
    `/schedules/${scheduleId}/cancel`,
  )

  return data.data.schedule
}

export async function fetchScheduleConflicts(
  termId: number,
): Promise<{ conflicts: ScheduleConflictRecord[] }> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ conflicts: ScheduleConflictRecord[] }>>(
    '/schedule-conflicts',
    { params: { academic_term_id: termId, per_page: 100 } },
  )

  return data.data
}

export async function resolveScheduleConflict(id: number, notes: string): Promise<void> {
  await apiClient.post(`/schedule-conflicts/${id}/resolve`, { resolution_notes: notes })
}

export async function waiveScheduleConflict(id: number, notes: string): Promise<void> {
  await apiClient.post(`/schedule-conflicts/${id}/waive`, { resolution_notes: notes })
}

export async function previewScheduleConflicts(id: number): Promise<ScheduleConflictPreview[]> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ conflicts: ScheduleConflictPreview[] }>>(
    `/schedules/${id}/validate`,
  )

  return data.data.conflicts
}

export async function fetchSchedulingTimeGrid(termId: number): Promise<SchedulingTimeGridIndex> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ configuration: SchedulingTimeGridIndex }>>(
    '/scheduling/configuration/time-grid',
    { params: { academic_term_id: termId } },
  )

  return data.data.configuration
}

export async function createSchedulingTimeGrid(
  input: SchedulingTimeGridInput & { academic_term_id: number },
): Promise<SchedulingTimeGrid> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ time_grid: SchedulingTimeGrid }>>(
    '/scheduling/configuration/time-grids',
    input,
  )

  return data.data.time_grid
}

export async function updateSchedulingTimeGrid(
  id: number,
  input: SchedulingTimeGridInput,
): Promise<SchedulingTimeGrid> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ time_grid: SchedulingTimeGrid }>>(
    `/scheduling/configuration/time-grids/${id}`,
    input,
  )

  return data.data.time_grid
}

export async function deleteSchedulingTimeGrid(id: number): Promise<void> {
  await apiClient.delete(`/scheduling/configuration/time-grids/${id}`)
}

export async function approveSchedulingTimeGrid(id: number): Promise<SchedulingTimeGrid> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ time_grid: SchedulingTimeGrid }>>(
    `/scheduling/configuration/time-grids/${id}/approve`,
  )

  return data.data.time_grid
}

export async function reviseSchedulingTimeGrid(id: number): Promise<SchedulingTimeGrid> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ time_grid: SchedulingTimeGrid }>>(
    `/scheduling/configuration/time-grids/${id}/revise`,
  )

  return data.data.time_grid
}

export async function fetchSchedulingMeetingPlans(
  termId: number,
): Promise<SchedulingMeetingPlanIndex> {
  const { data } = await apiClient.get<ApiSuccessResponse<SchedulingMeetingPlanIndex>>(
    '/scheduling/configuration/meeting-plans',
    { params: { academic_term_id: termId } },
  )

  return data.data
}

export async function createSchedulingMeetingPlan(
  input: SchedulingMeetingPlanInput,
): Promise<SchedulingMeetingPlan> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ meeting_plan: SchedulingMeetingPlan }>>(
    '/scheduling/configuration/meeting-plans',
    input,
  )

  return data.data.meeting_plan
}

export async function updateSchedulingMeetingPlan(
  id: number,
  input: SchedulingMeetingPlanInput,
): Promise<SchedulingMeetingPlan> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ meeting_plan: SchedulingMeetingPlan }>>(
    `/scheduling/configuration/meeting-plans/${id}`,
    input,
  )

  return data.data.meeting_plan
}

export async function deleteSchedulingMeetingPlan(id: number): Promise<void> {
  await apiClient.delete(`/scheduling/configuration/meeting-plans/${id}`)
}

export async function approveSchedulingMeetingPlan(id: number): Promise<SchedulingMeetingPlan> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ meeting_plan: SchedulingMeetingPlan }>>(
    `/scheduling/configuration/meeting-plans/${id}/approve`,
  )

  return data.data.meeting_plan
}

export async function reviseSchedulingMeetingPlan(id: number): Promise<SchedulingMeetingPlan> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ meeting_plan: SchedulingMeetingPlan }>>(
    `/scheduling/configuration/meeting-plans/${id}/revise`,
  )

  return data.data.meeting_plan
}
