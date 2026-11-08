import { useEffect, useState } from 'react'
import { fetchHealth } from '@/services/api/health'
import type { HealthPayload } from '@/types/api'
import { getApiErrorMessage } from '@/utils/apiError'

export type HealthState =
  | { status: 'checking'; data: null; error: null }
  | { status: 'online'; data: HealthPayload; error: null }
  | { status: 'offline'; data: null; error: string }

const initialState: HealthState = {
  status: 'checking',
  data: null,
  error: null,
}

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthState>(initialState)

  useEffect(() => {
    let active = true

    fetchHealth()
      .then((data) => {
        if (active) {
          setHealth({ status: 'online', data, error: null })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setHealth({
            status: 'offline',
            data: null,
            error: getApiErrorMessage(error, 'The API is not reachable.'),
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  return health
}
