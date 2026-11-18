import type { ApiSuccessResponse } from '@/types/api'
import type {
  RemovedStudentDirectory,
  RemovedStudentRecord,
  StudentAcademicHistoryDirectory,
  StudentActivityLogDirectory,
  StudentDetail,
  StudentDirectory,
  StudentFilters,
} from '@/types/students'
import { apiClient } from '@/services/api/client'

export interface StudentLogFilters {
  page?: number
  per_page?: number
}

export async function fetchStudents(filters: StudentFilters): Promise<StudentDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<StudentDirectory>>('/students', {
    params: filters,
  })

  return data.data
}

export async function fetchStudent(id: number): Promise<StudentDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ student: StudentDetail }>>(
    `/students/${id}`,
  )

  return data.data.student
}

export async function fetchStudentActivityLogs(
  filters: StudentLogFilters = {},
): Promise<StudentActivityLogDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<StudentActivityLogDirectory>>(
    '/students/activity-logs',
    { params: filters },
  )

  return data.data
}

export async function fetchStudentAcademicHistory(
  filters: StudentLogFilters = {},
): Promise<StudentAcademicHistoryDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<StudentAcademicHistoryDirectory>>(
    '/students/academic-history',
    { params: filters },
  )

  return data.data
}

export async function fetchRemovedStudents(
  filters: StudentLogFilters = {},
): Promise<RemovedStudentDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<RemovedStudentDirectory>>(
    '/students/removed',
    { params: filters },
  )

  return data.data
}

export async function removeStudent(id: number): Promise<RemovedStudentRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ removal: RemovedStudentRecord }>>(
    `/students/${id}/remove`,
  )

  return data.data.removal
}

export async function restoreStudent(id: number): Promise<RemovedStudentRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ removal: RemovedStudentRecord }>>(
    `/students/${id}/restore`,
  )

  return data.data.removal
}
