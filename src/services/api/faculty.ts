import type { ApiSuccessResponse } from '@/types/api'
import type {
  FacultyAvailabilityInput,
  FacultyAvailabilityRecord,
  FacultyDetail,
  FacultyDirectory,
  FacultyFilters,
  FacultyAssignmentRecord,
  OwnProfessorInput,
} from '@/types/faculty'
import { apiClient } from '@/services/api/client'

export async function fetchFaculty(filters: FacultyFilters): Promise<FacultyDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<FacultyDirectory>>('/faculty', {
    params: filters,
  })

  return data.data
}

export async function fetchProfessor(id: number): Promise<FacultyDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ professor: FacultyDetail }>>(
    `/faculty/${id}`,
  )

  return data.data.professor
}

export async function fetchOwnProfessor(): Promise<FacultyDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ professor: FacultyDetail }>>(
    '/faculty/me',
  )

  return data.data.professor
}

export async function updateOwnProfessor(input: OwnProfessorInput): Promise<FacultyDetail> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ professor: FacultyDetail }>>(
    '/faculty/me',
    input,
  )

  return data.data.professor
}

export async function fetchProfessorAssignments(
  professorId: number,
): Promise<FacultyAssignmentRecord[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ assignments: FacultyAssignmentRecord[] }>>(
    `/faculty/${professorId}/assignments`,
  )

  return data.data.assignments
}

export async function fetchProfessorAvailability(
  professorId: number,
): Promise<FacultyAvailabilityRecord[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ availability: FacultyAvailabilityRecord[] }>>(
    `/faculty/${professorId}/availability`,
  )

  return data.data.availability
}

export async function createFacultyAvailability(
  professorId: number,
  input: FacultyAvailabilityInput,
): Promise<FacultyAvailabilityRecord> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ availability: FacultyAvailabilityRecord }>>(
    `/faculty/${professorId}/availability`,
    input,
  )

  return data.data.availability
}

export async function updateFacultyAvailability(
  id: number,
  input: FacultyAvailabilityInput,
): Promise<FacultyAvailabilityRecord> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ availability: FacultyAvailabilityRecord }>>(
    `/faculty/availability/${id}`,
    input,
  )

  return data.data.availability
}

export async function deleteFacultyAvailability(id: number): Promise<void> {
  await apiClient.delete(`/faculty/availability/${id}`)
}
