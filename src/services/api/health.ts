import type { ApiSuccessResponse, HealthPayload } from '@/types/api'
import { apiClient } from '@/services/api/client'

export async function fetchHealth(): Promise<HealthPayload> {
  const { data } = await apiClient.get<ApiSuccessResponse<HealthPayload>>('/health')

  return data.data
}
