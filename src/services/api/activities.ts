import type { ApiSuccessResponse } from '@/types/api'
import type {
  Activity,
  ActivityFilters,
  ActivityHistoryEntry,
  ActivityInput,
  ActivityOptions,
  ActivityOverview,
  ActivityPagination,
} from '@/types/activity'
import { apiClient } from '@/services/api/client'

interface ActivityPage {
  activities: Activity[]
  overview: ActivityOverview
  pagination: ActivityPagination
}

interface ActivityHistoryPage {
  history: ActivityHistoryEntry[]
  pagination: ActivityPagination
}

export async function fetchManagedActivities(filters: ActivityFilters): Promise<ActivityPage> {
  const { data } = await apiClient.get<ApiSuccessResponse<ActivityPage>>('/activities/manage', {
    params: filters,
  })

  return data.data
}

export async function fetchActivityOptions(search?: string): Promise<ActivityOptions> {
  const { data } = await apiClient.get<ApiSuccessResponse<ActivityOptions>>('/activities/options', {
    params: search ? { search } : undefined,
  })

  return data.data
}

export async function createActivity(payload: ActivityInput): Promise<Activity> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ activity: Activity }>>(
    '/activities',
    payload,
  )

  return data.data.activity
}

export async function updateActivity(id: number, payload: ActivityInput): Promise<Activity> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ activity: Activity }>>(
    `/activities/${id}`,
    payload,
  )

  return data.data.activity
}

export async function publishActivity(id: number): Promise<Activity> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ activity: Activity }>>(
    `/activities/${id}/publish`,
  )

  return data.data.activity
}

export async function cancelActivity(id: number, reason: string): Promise<Activity> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ activity: Activity }>>(
    `/activities/${id}/cancel`,
    { reason },
  )

  return data.data.activity
}

export async function completeActivity(id: number): Promise<Activity> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ activity: Activity }>>(
    `/activities/${id}/complete`,
  )

  return data.data.activity
}

export async function fetchActivityHistory(id: number): Promise<ActivityHistoryPage> {
  const { data } = await apiClient.get<ApiSuccessResponse<ActivityHistoryPage>>(
    `/activities/${id}/history`,
  )

  return data.data
}
