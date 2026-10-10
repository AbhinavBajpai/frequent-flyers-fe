import type { AdminCalendarResponse, AdminChallengeResponse, AdminCollaboratorsResponse, AdminImportResponse, AdminPeopleSearchResponse, AdminPersonResult, AdminPreview, AdminPublishResponse, ApiErrorPayload, CollaboratorResponse, DailyResponse, PersonSummary, PlayResponse, ProjectGuessResponse, ProjectSummary, SearchPeopleResponse, SearchProjectsResponse } from './types'

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

function adminRequest<T>(path: string, adminKey: string, init?: RequestInit) {
  return apiRequest<T>(path, { ...init, headers: { 'X-Admin-Key': adminKey, ...init?.headers } })
}

function adminJson(adminKey: string, body?: unknown, method = 'POST'): RequestInit {
  return { method, headers: { 'X-Admin-Key': adminKey, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
}

export const gameApi = {
  getDaily: () => apiRequest<DailyResponse>('/v1/challenges/daily', { credentials: 'include' }),
  getPlay: (playId: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}`, { credentials: 'include' }),
  searchPeople: (query: string) => apiRequest<SearchPeopleResponse>(`/v1/people/search?q=${encodeURIComponent(query)}&limit=8`, { credentials: 'include' }),
  searchProjects: (query: string) => apiRequest<SearchProjectsResponse>(`/v1/projects/search?q=${encodeURIComponent(query)}&limit=8`, { credentials: 'include' }),
  submitCollaborator: (playId: string, person: PersonSummary, key: string) => apiRequest<CollaboratorResponse>(`/v1/plays/${playId}/collaborator`, json({ person: { source: person.source ?? 'tmdb', tmdb_id: person.tmdb_id }, idempotency_key: key })),
  submitProject: (playId: string, project: ProjectSummary, key: string) => apiRequest<ProjectGuessResponse>(`/v1/plays/${playId}/project-guesses`, json({ project: { source: project.source, media_type: project.media_type, tmdb_id: project.tmdb_id }, idempotency_key: key })),
  finish: (playId: string, key: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}/finish`, json({ idempotency_key: key })),
}


export const adminApi = {
  searchPeople: async (adminKey: string, query: string): Promise<AdminPeopleSearchResponse> => {
    const response = await adminRequest<{ source: 'cache' | 'tmdb'; results: Array<Omit<AdminPersonResult, 'id' | 'tmdb_id'> & { id: number; tmdb_id?: number }> }>(`/v1/admin/people/search?q=${encodeURIComponent(query)}&limit=10`, adminKey)
    if (response.source === 'cache') return response as unknown as AdminPeopleSearchResponse
    return { ...response, results: response.results.map((person) => ({ ...person, id: undefined, tmdb_id: Number(person.id), source: 'tmdb' as const, profile_url: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null })) }
  },
  importPerson: (adminKey: string, tmdbId: number) => adminRequest<AdminImportResponse>(`/v1/admin/people/${tmdbId}/import`, adminKey, adminJson(adminKey)),
  getCollaborators: (adminKey: string, personId: string) => adminRequest<AdminCollaboratorsResponse>(`/v1/admin/people/${personId}/collaborators`, adminKey),
  createChallenge: (adminKey: string, personId: string) => adminRequest<AdminChallengeResponse>('/v1/admin/challenges', adminKey, adminJson(adminKey, { featured_person_id: personId })),
  scheduleChallenge: (adminKey: string, challengeId: string, date: string) => adminRequest<AdminChallengeResponse>(`/v1/admin/challenges/${challengeId}/schedule`, adminKey, adminJson(adminKey, { date }, 'PUT')),
  previewChallenge: (adminKey: string, challengeId: string) => adminRequest<AdminPreview>(`/v1/admin/challenges/${challengeId}/refresh-preview`, adminKey, adminJson(adminKey)),
  publishChallenge: (adminKey: string, challengeId: string) => adminRequest<AdminPublishResponse>(`/v1/admin/challenges/${challengeId}/publish`, adminKey, adminJson(adminKey)),
  getCalendar: (adminKey: string, from: string, to: string) => adminRequest<AdminCalendarResponse>(`/v1/admin/challenges/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, adminKey),
}
