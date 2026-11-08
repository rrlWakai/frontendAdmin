import type { ApiSuccessResponse } from '@/types/api'
import type {
  AcademicOptions,
  AcademicPagination,
  AcademicRecord,
  AcademicResource,
} from '@/types/academic'
import { apiClient } from '@/services/api/client'

export interface AcademicFilters {
  search?: string
  status?: string
  program_id?: number
  year_level_id?: number
  academic_term_id?: number
  page?: number
  per_page?: number
}

interface AcademicDirectoryData<T extends AcademicRecord> {
  programs?: T[]
  terms?: T[]
  year_levels?: T[]
  subjects?: T[]
  sections?: T[]
  pagination: AcademicPagination
}

export async function fetchAcademicDirectory<T extends AcademicRecord>(
  resource: AcademicResource,
  filters: AcademicFilters,
): Promise<{ records: T[]; pagination: AcademicPagination }> {
  const { data } = await apiClient.get<ApiSuccessResponse<AcademicDirectoryData<T>>>(
    `/academic/${resource}`,
    { params: filters },
  )

  const records = (() => {
    switch (resource) {
      case 'programs':
        return data.data.programs ?? []
      case 'terms':
        return data.data.terms ?? []
      case 'year-levels':
        return data.data.year_levels ?? []
      case 'subjects':
        return data.data.subjects ?? []
      case 'sections':
        return data.data.sections ?? []
    }
  })()

  return { records, pagination: data.data.pagination }
}

export async function fetchAcademicOptions(): Promise<AcademicOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<AcademicOptions>>('/academic/options')

  return data.data
}

export async function createAcademicRecord<T extends AcademicRecord>(
  resource: AcademicResource,
  payload: Record<string, string | number | boolean | null>,
): Promise<T> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ [key: string]: T }>>(
    `/academic/${resource}`,
    payload,
  )

  return data.data[resource === 'year-levels' ? 'year_level' : resource.slice(0, -1)]!
}

export async function updateAcademicRecord<T extends AcademicRecord>(
  resource: AcademicResource,
  id: number,
  payload: Record<string, string | number | boolean | null>,
): Promise<T> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ [key: string]: T }>>(
    `/academic/${resource}/${id}`,
    payload,
  )

  return data.data[resource === 'year-levels' ? 'year_level' : resource.slice(0, -1)]!
}
