import type { ApiSuccessResponse } from '@/types/api'
import type {
  AttendanceFilters,
  AttendanceOptions,
  AttendancePagination,
  AttendanceRecordItem,
  AttendanceSession,
  AttendanceSessionDetail,
  AttendanceSummary,
  AttendanceStatus,
} from '@/types/attendance'
import { apiClient } from '@/services/api/client'

export async function fetchAttendanceOptions(): Promise<AttendanceOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<AttendanceOptions>>('/attendance/options')
  return data.data
}

export async function fetchAttendanceSessions(
  filters: AttendanceFilters,
): Promise<{ sessions: AttendanceSession[]; pagination: AttendancePagination }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ sessions: AttendanceSession[]; pagination: AttendancePagination }>
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
