import type { ApiSuccessResponse } from '@/types/api'
import type {
  StudentScheduleConflictFilters,
  StudentScheduleConflictOptions,
  StudentScheduleConflictPage,
} from '@/types/studentScheduleConflicts'
import { apiClient } from '@/services/api/client'

export async function fetchStudentScheduleConflictOptions(
  termId?: number,
): Promise<StudentScheduleConflictOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<StudentScheduleConflictOptions>>(
    '/student-schedule-conflicts/options',
    { params: termId ? { academic_term_id: termId } : undefined },
  )

  return data.data
}

export async function fetchStudentScheduleConflicts(
  filters: StudentScheduleConflictFilters,
): Promise<StudentScheduleConflictPage> {
  const { data } = await apiClient.get<ApiSuccessResponse<StudentScheduleConflictPage>>(
    '/student-schedule-conflicts',
    { params: filters },
  )

  return data.data
}
