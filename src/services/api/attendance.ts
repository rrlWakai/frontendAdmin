import type { ApiSuccessResponse } from '@/types/api'
import type {
  AttendanceFilters,
  AttendanceOptions,
  AttendancePagination,
  AttendanceRecordItem,
  AttendanceSession,
  AttendanceSessionDetail,
  AttendanceSessionSummary,
  AttendanceSummary,
  AttendanceStatus,
} from '@/types/attendance'
import { apiClient } from '@/services/api/client'

export interface AttendancePolicy {
  id: number
  academic_term_id: number
  subject_offering_id: number | null
  allowed_absences: number
  effective_at: string
  created_by?: { id: number; name: string } | null
  subject_offering?: {
    id: number
    subject?: { code: string; title: string }
    section?: { code: string; name: string | null }
  } | null
}

export async function fetchAttendancePolicies(academicTermId?: number): Promise<AttendancePolicy[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ policies: AttendancePolicy[] }>>(
    '/attendance/policies',
    { params: academicTermId ? { academic_term_id: academicTermId } : undefined },
  )
  return data.data.policies
}

export async function createAttendancePolicy(input: {
  academic_term_id: number
  subject_offering_id: number | null
  allowed_absences: number
}): Promise<AttendancePolicy> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ policy: AttendancePolicy }>>(
    '/attendance/policies',
    input,
  )
  return data.data.policy
}

export async function fetchAttendanceOptions(): Promise<AttendanceOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<AttendanceOptions>>('/attendance/options')
  return data.data
}

export async function fetchAttendanceSessions(
  filters: AttendanceFilters,
): Promise<{
  sessions: AttendanceSession[]
  pagination: AttendancePagination
  summary: AttendanceSessionSummary
}> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{
      sessions: AttendanceSession[]
      pagination: AttendancePagination
      summary: AttendanceSessionSummary
    }>
  >('/attendance/sessions', { params: filters })
  return data.data
}

export async function fetchAttendanceMonitoring(
  filters: AttendanceFilters,
): Promise<{
  records: AttendanceRecordItem[]
  pagination: AttendancePagination
  summary: AttendanceSummary
}> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{
      records: AttendanceRecordItem[]
      pagination: AttendancePagination
      summary: AttendanceSummary
    }>
  >('/attendance/monitoring', { params: filters })
  return data.data
}

export async function fetchAttendanceSession(id: number): Promise<AttendanceSessionDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<AttendanceSessionDetail>>(
    `/attendance/sessions/${id}`,
  )
  return data.data
}

export async function correctAttendanceRecords(
  id: number,
  records: Array<{
    student_subject_enrollment_id: number
    status: AttendanceStatus
    remarks: string | null
  }>,
  correctionReason: string,
): Promise<void> {
  await apiClient.put(`/attendance/sessions/${id}/records`, {
    records,
    correction_reason: correctionReason,
  })
}
