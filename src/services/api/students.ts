import type { ApiSuccessResponse } from '@/types/api'
import type {
  StudentDetail,
  StudentDirectory,
  StudentFilters,
} from '@/types/students'
import { apiClient } from '@/services/api/client'

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
