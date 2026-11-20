import type { ApiSuccessResponse } from '@/types/api'
import type {
  CandidateRevisionStatusEvent,
  CandidateStatusEvent,
  CreateCandidateRevisionInput,
  FacultyAssignmentInput,
  FacultyAssignmentOption,
  ScheduleConflictPreview,
  ScheduleConflictRecord,
  ScheduleDirectory,
  ScheduleFilters,
  ScheduleInput,
  ScheduleRecord,
  SchedulingCandidateDetail,
  SchedulingCandidateLifecycleInput,
  SchedulingCandidateLifecycleResult,
  SchedulingCandidateRevisionDetail,
  SchedulingCandidateRevisionSummary,
  SchedulingGenerationHistoryFilters,
  SchedulingGenerationHistoryResponse,
  SchedulingMeetingPlan,
  SchedulingMeetingPlanIndex,
  SchedulingMeetingPlanInput,
  SchedulingOptions,
  SchedulingReadiness,
  SchedulingSolveInput,
  SchedulingSolveResponse,
  SchedulingTimeGrid,
  SchedulingTimeGridIndex,
  SchedulingTimeGridInput,
  TimetablePublicationRecord,
  TransitionCandidateRevisionInput,
  UpdateCandidateRevisionInput,
  ValidateCandidateRevisionInput,
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

export async function fetchSchedulingGenerationHistory(
  filters: SchedulingGenerationHistoryFilters,
): Promise<SchedulingGenerationHistoryResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<SchedulingGenerationHistoryResponse>>(
    '/scheduling/generations',
    { params: filters },
  )

  return data.data
}

export async function solveScheduling(input: SchedulingSolveInput): Promise<SchedulingSolveResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<SchedulingSolveResponse>>(
    '/scheduling/solve',
    input,
  )

  return data.data
}

export async function fetchSchedulingCandidate(candidateUuid: string): Promise<SchedulingCandidateDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<SchedulingCandidateDetail>>(
    `/scheduling/candidates/${candidateUuid}`,
  )

  return data.data
}

export async function reviewSchedulingCandidate(
  candidateUuid: string,
  input: SchedulingCandidateLifecycleInput,
): Promise<SchedulingCandidateLifecycleResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<SchedulingCandidateLifecycleResult>>(
    `/scheduling/candidates/${candidateUuid}/review`,
    input,
  )

  return data.data
}

export async function approveSchedulingCandidate(
  candidateUuid: string,
  input: SchedulingCandidateLifecycleInput,
): Promise<SchedulingCandidateLifecycleResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<SchedulingCandidateLifecycleResult>>(
    `/scheduling/candidates/${candidateUuid}/approve`,
    input,
  )

  return data.data
}

export async function rejectSchedulingCandidate(
  candidateUuid: string,
  input: SchedulingCandidateLifecycleInput,
): Promise<SchedulingCandidateLifecycleResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<SchedulingCandidateLifecycleResult>>(
    `/scheduling/candidates/${candidateUuid}/reject`,
    input,
  )

  return data.data
}

export async function publishSchedulingCandidate(
  candidateUuid: string,
  input: SchedulingCandidateLifecycleInput,
): Promise<SchedulingCandidateLifecycleResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<SchedulingCandidateLifecycleResult>>(
    `/scheduling/candidates/${candidateUuid}/publish`,
    input,
  )

  return data.data
}

export async function fetchSchedulingCandidateStatusEvents(
  candidateUuid: string,
): Promise<CandidateStatusEvent[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ status_events: CandidateStatusEvent[] }>>(
    `/scheduling/candidates/${candidateUuid}/status-events`,
  )

  return data.data.status_events
}

export async function fetchTimetablePublications(
  academicTermId: number,
): Promise<TimetablePublicationRecord[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ publications: TimetablePublicationRecord[] }>>(
    '/scheduling/publications',
    { params: { academic_term_id: academicTermId } },
  )

  return data.data.publications
}

export async function fetchActiveTimetablePublication(
  academicTermId: number,
): Promise<TimetablePublicationRecord | null> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ publication: TimetablePublicationRecord | null }>>(
    '/scheduling/publications/active',
    { params: { academic_term_id: academicTermId } },
  )

  return data.data.publication
}

export async function createSchedulingCandidateRevision(
  candidateUuid: string,
  input: CreateCandidateRevisionInput,
): Promise<SchedulingCandidateRevisionSummary> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ revision: SchedulingCandidateRevisionSummary }>>(
    `/scheduling/candidates/${candidateUuid}/revisions`,
    input,
  )

  return data.data.revision
}

export async function fetchSchedulingCandidateRevision(
  revisionUuid: string,
): Promise<SchedulingCandidateRevisionDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<SchedulingCandidateRevisionDetail>>(
    `/scheduling/candidate-revisions/${revisionUuid}`,
  )

  return data.data
}

export async function updateSchedulingCandidateRevision(
  revisionUuid: string,
  input: UpdateCandidateRevisionInput,
): Promise<SchedulingCandidateRevisionSummary> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ revision: SchedulingCandidateRevisionSummary }>>(
    `/scheduling/candidate-revisions/${revisionUuid}`,
    input,
  )

  return data.data.revision
}

export async function validateSchedulingCandidateRevision(
  revisionUuid: string,
  input: ValidateCandidateRevisionInput,
): Promise<{ revision: SchedulingCandidateRevisionSummary; errors: string[] }> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ revision: SchedulingCandidateRevisionSummary; errors: string[] }>>(
    `/scheduling/candidate-revisions/${revisionUuid}/validate`,
    input,
  )

  return data.data
}

export async function transitionSchedulingCandidateRevision(
  revisionUuid: string,
  input: TransitionCandidateRevisionInput,
): Promise<SchedulingCandidateRevisionSummary> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ revision: SchedulingCandidateRevisionSummary }>>(
    `/scheduling/candidate-revisions/${revisionUuid}/transition`,
    input,
  )

  return data.data.revision
}

export async function fetchSchedulingCandidateRevisionEvents(
  revisionUuid: string,
): Promise<CandidateRevisionStatusEvent[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ status_events: CandidateRevisionStatusEvent[] }>>(
    `/scheduling/candidate-revisions/${revisionUuid}/status-events`,
  )

  return data.data.status_events
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
