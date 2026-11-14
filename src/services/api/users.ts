import type { ApiSuccessResponse } from '@/types/api'
import type {
  CreateUserInput,
  ManagedUser,
  UpdateUserInput,
  UserDirectory,
  UserOptions,
} from '@/types/users'
import { apiClient } from '@/services/api/client'

export interface UserFilters {
  search?: string
  role?: string
  status?: string
  page?: number
  per_page?: number
}

export type ProfessorReviewAction = 'approve' | 'return' | 'reject'

export async function createDepartment(input: { code: string; name: string }): Promise<void> {
  await apiClient.post('/users/departments', input)
}

export async function fetchUsers(filters: UserFilters): Promise<UserDirectory> {
  const { data } = await apiClient.get<ApiSuccessResponse<UserDirectory>>('/users', {
    params: filters,
  })

  return data.data
}

export async function fetchUserOptions(): Promise<UserOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<UserOptions>>('/users/options')

  return data.data
}

export async function fetchUser(id: number): Promise<ManagedUser> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ user: ManagedUser }>>(
    `/users/${id}`,
  )

  return data.data.user
}

export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ user: ManagedUser }>>(
    '/users',
    input,
  )

  return data.data.user
}

export async function updateUser(
  id: number,
  input: UpdateUserInput,
): Promise<ManagedUser> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ user: ManagedUser }>>(
    `/users/${id}`,
    input,
  )

  return data.data.user
}

export async function updateUserStatus(
  id: number,
  status: 'active' | 'inactive',
): Promise<ManagedUser> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ user: ManagedUser }>>(
    `/users/${id}/status`,
    { status },
  )

  return data.data.user
}

export async function reviewProfessorRegistration(
  id: number,
  action: ProfessorReviewAction,
  reason?: string,
): Promise<ManagedUser> {
  const endpoint = {
    approve: 'approve-professor',
    return: 'return-professor',
    reject: 'reject-professor',
  }[action]
  const { data } = await apiClient.post<ApiSuccessResponse<{ user: ManagedUser }>>(
    `/users/${id}/${endpoint}`,
    reason ? { reason } : {},
  )

  return data.data.user
}

export async function updateDepartmentPersonnelProgramAccess(
  id: number,
  programIds: number[],
): Promise<ManagedUser> {
  const { data } = await apiClient.put<ApiSuccessResponse<{ user: ManagedUser }>>(
    `/users/${id}/program-access`,
    { program_ids: programIds },
  )

  return data.data.user
}
