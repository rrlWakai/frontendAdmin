import type { ApiSuccessResponse } from '@/types/api'
import type {
  AcademicMajorSelection,
  AcademicOptions,
  AcademicPagination,
  AcademicRecord,
  AcademicResource,
  DuePromotion,
  PromotionAllocation,
  PromotionRun,
  PromotionRunItem,
} from '@/types/academic'
import { apiClient } from '@/services/api/client'

export interface AcademicFilters {
  search?: string
  status?: string
  program_id?: number
  year_level_id?: number
  semester?: string
  classification?: string
  academic_term_id?: number
  academic_year_id?: number
  major_id?: number
  subject_id?: number
  target_year_level_id?: number
  page?: number
  per_page?: number
}

interface AcademicDirectoryData<T extends AcademicRecord> {
  programs?: T[]
  terms?: T[]
  year_levels?: T[]
  subjects?: T[]
  sections?: T[]
  academic_years?: T[]
  majors?: T[]
  curriculum_requirements?: T[]
  major_selection_periods?: T[]
  pagination: AcademicPagination
}

const directoryKeys: Record<AcademicResource, keyof AcademicDirectoryData<AcademicRecord>> = {
  programs: 'programs',
  terms: 'terms',
  'year-levels': 'year_levels',
  subjects: 'subjects',
  sections: 'sections',
  'academic-years': 'academic_years',
  majors: 'majors',
  'curriculum-requirements': 'curriculum_requirements',
  'major-selection-periods': 'major_selection_periods',
}

const recordKeys: Record<AcademicResource, string> = {
  programs: 'program',
  terms: 'term',
  'year-levels': 'year_level',
  subjects: 'subject',
  sections: 'section',
  'academic-years': 'academic_year',
  majors: 'major',
  'curriculum-requirements': 'curriculum_requirement',
  'major-selection-periods': 'major_selection_period',
}

export async function fetchAcademicDirectory<T extends AcademicRecord>(
  resource: AcademicResource,
  filters: AcademicFilters,
): Promise<{ records: T[]; pagination: AcademicPagination }> {
  const { data } = await apiClient.get<ApiSuccessResponse<AcademicDirectoryData<T>>>(
    `/academic/${resource}`,
    { params: filters },
  )

  const records = (data.data[directoryKeys[resource]] as T[] | undefined) ?? []

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
  const { data } = await apiClient.post<ApiSuccessResponse<Record<string, T>>>(
    `/academic/${resource}`,
    payload,
  )

  return data.data[recordKeys[resource]]!
}

export async function updateAcademicRecord<T extends AcademicRecord>(
  resource: AcademicResource,
  id: number,
  payload: Record<string, string | number | boolean | null>,
): Promise<T> {
  const { data } = await apiClient.patch<ApiSuccessResponse<Record<string, T>>>(
    `/academic/${resource}/${id}`,
    payload,
  )

  return data.data[recordKeys[resource]]!
}

export interface MajorSelectionFilters extends AcademicFilters {
  major_id?: number
  academic_year_id?: number
}

export async function fetchMajorSelections(
  filters: MajorSelectionFilters,
): Promise<{ records: AcademicMajorSelection[]; pagination: AcademicPagination }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{
      major_selections: AcademicMajorSelection[]
      pagination: AcademicPagination
    }>
  >('/academic/major-selections', { params: filters })

  return {
    records: data.data.major_selections ?? [],
    pagination: data.data.pagination,
  }
}

export async function reviewMajorSelection(
  selectionId: number,
  payload: { status: 'approved' | 'rejected'; remarks?: string | null },
): Promise<AcademicMajorSelection> {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<{ major_selection: AcademicMajorSelection }>
  >(`/academic/major-selections/${selectionId}/review`, payload)

  return data.data.major_selection
}

export async function correctMajorSelection(
  selectionId: number,
  payload: { major_id: number; reason: string },
): Promise<AcademicMajorSelection> {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<{ major_selection: AcademicMajorSelection }>
  >(`/academic/major-selections/${selectionId}/correct`, payload)

  return data.data.major_selection
}

export async function fetchDuePromotions(): Promise<DuePromotion[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ due_promotions: DuePromotion[] }>>(
    '/academic/promotions/due',
  )

  return data.data.due_promotions ?? []
}

export async function fetchPromotionRuns(
  filters: AcademicFilters,
): Promise<{ records: PromotionRun[]; pagination: AcademicPagination }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ promotion_runs: PromotionRun[]; pagination: AcademicPagination }>
  >('/academic/promotions', { params: filters })

  return {
    records: data.data.promotion_runs ?? [],
    pagination: data.data.pagination,
  }
}

export async function fetchPromotionRun(runId: number): Promise<PromotionRun> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ promotion_run: PromotionRun }>>(
    `/academic/promotions/${runId}`,
  )

  return data.data.promotion_run
}

export interface PreparePromotionInput {
  source_academic_year_id: number
  source_term_id: number
  target_academic_year_id: number
  target_term_id: number
}

export async function preparePromotionRun(input: PreparePromotionInput): Promise<PromotionRun> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ promotion_run: PromotionRun }>>(
    '/academic/promotions',
    input,
  )

  return data.data.promotion_run
}

export async function adjustPromotionItem(
  runId: number,
  itemId: number,
  payload: { to_year_level_id?: number | null; major_id?: number | null; section_id?: number | null },
): Promise<PromotionRunItem> {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<{ promotion_run_item: PromotionRunItem }>
  >(`/academic/promotions/${runId}/items/${itemId}`, payload)

  return data.data.promotion_run_item
}

export async function allocatePromotionRun(
  runId: number,
): Promise<{ run: PromotionRun; allocation: PromotionAllocation }> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<{ promotion_run: PromotionRun; allocation: PromotionAllocation }>
  >(`/academic/promotions/${runId}/allocate`)

  return {
    run: data.data.promotion_run,
    allocation: data.data.allocation,
  }
}

export async function finalizePromotionRun(
  runId: number,
  allowShortages: boolean,
): Promise<PromotionRun> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ promotion_run: PromotionRun }>>(
    `/academic/promotions/${runId}/finalize`,
    { allow_shortages: allowShortages },
  )

  return data.data.promotion_run
}
