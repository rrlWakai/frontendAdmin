export interface ApiSuccessResponse<T> {
  success: true
  message: string
  data: T
}

export interface ApiErrorResponse {
  success: false
  message: string
  code?: string
  errors?: Record<string, string[]>
}

export interface HealthPayload {
  status: string
  application: string
  version: string
  timestamp: string
}
