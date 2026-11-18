import type { ApiSuccessResponse } from '@/types/api'
import type {
  CurriculumSubjectFilters,
  SubjectOffering,
  SubjectOfferingDetail,
  SubjectOfferingFilters,
  SubjectOfferingInput,
  SubjectOfferingOptions,
  SubjectOfferingPagination,
  SubjectOfferingPreparationPlan,
  SubjectOfferingPreparationResult,
  SubjectOfferingStatus,
  SubjectOfferingSubject,
  SubjectOfferingSummary,
  SubjectOfferingUpdateInput,
} from '@/types/subjectOffering'
import { apiClient } from '@/services/api/client'

interface SubjectOfferingDirectoryData {
  offerings: SubjectOffering[]
  pagination: SubjectOfferingPagination
  summary: SubjectOfferingSummary | null
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

export async function fetchSubjectOfferingPreparationPlan(
  termId: number,
): Promise<SubjectOfferingPreparationPlan> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ preparation: SubjectOfferingPreparationPlan }>>(
    '/academic/subject-offerings/preparation-plan',
    { params: { academic_term_id: termId } },
  )

  return data.data.preparation
}

export async function prepareSubjectOfferingClasses(
  termId: number,
): Promise<SubjectOfferingPreparationResult> {
  const { data } = await apiClient.post<ApiSuccessResponse<SubjectOfferingPreparationResult>>(
    '/academic/subject-offerings/prepare',
    { academic_term_id: termId },
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

export async function fetchCurriculumSubjects(
  filters: CurriculumSubjectFilters,
): Promise<SubjectOfferingSubject[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ subjects: SubjectOfferingSubject[] }>>(
    '/academic/curriculum/subjects',
    { params: filters },
  )

  return data.data.subjects
}
