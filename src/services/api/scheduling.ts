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
  SchedulingOptions,
} from '@/types/scheduling'
import { apiClient } from '@/services/api/client'

export async function fetchSchedulingOptions(termId: number): Promise<SchedulingOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<SchedulingOptions>>('/scheduling/options', {
    params: { academic_term_id: termId },
  })

  return data.data
}

export async function fetchSchedules(filters: ScheduleFilters): Promise<ScheduleDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<ScheduleDirectory>>('/schedules', {
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
