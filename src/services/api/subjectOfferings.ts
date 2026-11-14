import type { ApiSuccessResponse } from '@/types/api'
import type {
  SubjectOffering,
  SubjectOfferingDetail,
  SubjectOfferingFilters,
  SubjectOfferingInput,
  SubjectOfferingOptions,
  SubjectOfferingPagination,
  SubjectOfferingStatus,
  SubjectOfferingUpdateInput,
} from '@/types/subjectOffering'
import { apiClient } from '@/services/api/client'

interface SubjectOfferingDirectoryData {
  offerings: SubjectOffering[]
  pagination: SubjectOfferingPagination
}

export async function fetchSubjectOfferings(
  filters: SubjectOfferingFilters,
): Promise<SubjectOfferingDirectoryData> {
  const { data } = await apiClient.get<ApiSuccessResponse<SubjectOfferingDirectoryData>>(
    '/academic/subject-offerings',
    { params: filters },
  )

  return data.data
}

export async function fetchSubjectOffering(id: number): Promise<SubjectOfferingDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ subject_offering: SubjectOfferingDetail }>>(
    `/academic/subject-offerings/${id}`,
  )

  return data.data.subject_offering
}

export async function fetchSubjectOfferingOptions(): Promise<SubjectOfferingOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<SubjectOfferingOptions>>(
    '/academic/subject-offerings/options',
  )

  return data.data
}

export async function createSubjectOffering(
  payload: SubjectOfferingInput,
): Promise<SubjectOffering> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ subject_offering: SubjectOffering }>>(
    '/academic/subject-offerings',
    payload,
  )

  return data.data.subject_offering
}

export async function updateSubjectOffering(
  id: number,
  payload: SubjectOfferingUpdateInput,
): Promise<SubjectOffering> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ subject_offering: SubjectOffering }>>(
    `/academic/subject-offerings/${id}`,
    payload,
  )

  return data.data.subject_offering
}

export async function updateSubjectOfferingStatus(
  id: number,
  status: Extract<SubjectOfferingStatus, 'open' | 'closed'>,
): Promise<SubjectOffering> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ subject_offering: SubjectOffering }>>(
    `/academic/subject-offerings/${id}/status`,
    { status },
  )

  return data.data.subject_offering
}
