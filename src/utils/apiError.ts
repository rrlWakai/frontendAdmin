import axios from 'axios'
import type { ApiErrorResponse } from '@/types/api'

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function getApiFieldErrors(error: unknown): Record<string, string[]> {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.errors ?? {}
  }

  return {}
}
