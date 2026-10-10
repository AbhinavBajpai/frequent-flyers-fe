import type { ApiErrorPayload, CollaboratorResponse, DailyResponse, PersonSummary, PlayResponse, ProjectGuessResponse, ProjectSummary, SearchPeopleResponse, SearchProjectsResponse } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorPayload | null
    throw new ApiError(payload?.error?.message ?? payload?.detail ?? payload?.message ?? 'Something went wrong', response.status, payload?.error?.code)
  }

  return response.json() as Promise<T>
}

function json(body: unknown): RequestInit {
  return { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export const gameApi = {
  getDaily: () => apiRequest<DailyResponse>('/v1/challenges/daily', { credentials: 'include' }),
  getPlay: (playId: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}`, { credentials: 'include' }),
  searchPeople: (query: string) => apiRequest<SearchPeopleResponse>(`/v1/people/search?q=${encodeURIComponent(query)}&limit=8`, { credentials: 'include' }),
  searchProjects: (query: string) => apiRequest<SearchProjectsResponse>(`/v1/projects/search?q=${encodeURIComponent(query)}&limit=8`, { credentials: 'include' }),
  submitCollaborator: (playId: string, person: PersonSummary, key: string) => apiRequest<CollaboratorResponse>(`/v1/plays/${playId}/collaborator`, json({ person: { source: person.source, tmdb_id: person.tmdb_id }, idempotency_key: key })),
  submitProject: (playId: string, project: ProjectSummary, key: string) => apiRequest<ProjectGuessResponse>(`/v1/plays/${playId}/project-guesses`, json({ project: { source: project.source, media_type: project.media_type, tmdb_id: project.tmdb_id }, idempotency_key: key })),
  finish: (playId: string, key: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}/finish`, json({ idempotency_key: key })),
}
