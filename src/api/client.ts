import type { ApiErrorPayload } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorPayload | null
    throw new ApiError(payload?.detail ?? payload?.message ?? 'Something went wrong', response.status)
  }

  return response.json() as Promise<T>
}
