import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const backendOrigin = new URL(baseURL, window.location.origin).origin

export const UNAUTHORIZED_EVENT = 'ccsync:unauthorized'
export const FORBIDDEN_EVENT = 'ccsync:forbidden'

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export async function bootstrapCsrfCookie(): Promise<void> {
  await axios.get(`${backendOrigin}/sanctum/csrf-cookie`, {
    withCredentials: true,
    withXSRFToken: true,
    headers: {
      Accept: 'application/json',
    },
  })
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as
      | (InternalAxiosRequestConfig & { csrfRetried?: boolean })
      | undefined
    const status = error.response?.status

    if (status === 419 && config && !config.csrfRetried) {
      config.csrfRetried = true
      await bootstrapCsrfCookie()

      return apiClient.request(config)
    }

    if (status === 401 && !config?.url?.includes('/auth/login')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }

    if (status === 403 && !config?.url?.includes('/auth/')) {
      window.dispatchEvent(new Event(FORBIDDEN_EVENT))
    }

    return Promise.reject(error)
  },
)
