import type { AccountUser, AdminCalendarResponse, AdminChallengeResponse, AdminChallengesResponse, AdminCollaboratorsResponse, AdminImportResponse, AdminPeopleSearchResponse, AdminPersonResult, AdminPreview, AdminPublishResponse, ApiErrorPayload, ArchiveResponse, AuthResponse, CollaboratorResponse, DailyResponse, FriendInviteResponse, FriendResultsResponse, FriendsResponse, PersonSummary, PlayResponse, ProjectGuessResponse, ProjectSummary, SearchPeopleResponse, SearchProjectsResponse } from './types'

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

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function json(body: unknown): RequestInit {
  return { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

function adminJson(body?: unknown, method = 'POST'): RequestInit {
  return { method, credentials: 'include', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
}

export const gameApi = {
  getDaily: () => apiRequest<DailyResponse>('/v1/challenges/daily', { credentials: 'include' }),
  getArchive: () => apiRequest<ArchiveResponse>('/v1/challenges/archive', { credentials: 'include' }),
  getChallenge: (challengeId: string) => apiRequest<DailyResponse>(`/v1/challenges/${challengeId}`, { credentials: 'include' }),
  getPlay: (playId: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}`, { credentials: 'include' }),
  searchPeople: (query: string) => apiRequest<SearchPeopleResponse>(`/v1/people/search?q=${encodeURIComponent(query)}&limit=8`, { credentials: 'include' }),
  searchProjects: (query: string) => apiRequest<SearchProjectsResponse>(`/v1/projects/search?q=${encodeURIComponent(query)}&limit=8`, { credentials: 'include' }),
  submitCollaborator: (playId: string, person: PersonSummary, key: string) => apiRequest<CollaboratorResponse>(`/v1/plays/${playId}/collaborator`, json({ person: { source: person.source ?? 'tmdb', tmdb_id: person.tmdb_id }, idempotency_key: key })),
  submitProject: (playId: string, project: ProjectSummary, key: string) => apiRequest<ProjectGuessResponse>(`/v1/plays/${playId}/project-guesses`, json({ project: { source: project.source, media_type: project.media_type, tmdb_id: project.tmdb_id }, idempotency_key: key })),
  retryResolution: (playId: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}/resolution/retry`, { method: 'POST', credentials: 'include' }),
  finish: (playId: string, key: string) => apiRequest<PlayResponse>(`/v1/plays/${playId}/finish`, json({ idempotency_key: key })),
}

export const authApi = {
  me: async (): Promise<AccountUser | null> => {
    try {
      const response = await apiRequest<{ user: AccountUser | null }>('/v1/auth/me', { credentials: 'include' })
      return response.user
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  signup: (email: string, password: string) => apiRequest<AuthResponse>('/v1/auth/signup', json({ email, password })),
  login: (email: string, password: string) => apiRequest<AuthResponse>('/v1/auth/login', json({ email, password })),
  logout: () => apiRequest<void>('/v1/auth/logout', { method: 'POST', credentials: 'include' }),
}

export const friendsApi = {
  list: () => apiRequest<FriendsResponse>('/v1/friends', { credentials: 'include' }),
  createInvite: () => apiRequest<FriendInviteResponse>('/v1/friends/invites', { method: 'POST', credentials: 'include' }),
  acceptInvite: (token: string) => apiRequest<{ friend: AccountUser }>(`/v1/friends/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', credentials: 'include' }),
  challengeResults: (challengeId: string) => apiRequest<FriendResultsResponse>(`/v1/challenges/${challengeId}/friends/results`, { credentials: 'include' }),
}


export const adminApi = {
  getChallenges: () => apiRequest<AdminChallengesResponse>('/v1/admin/challenges', { credentials: 'include' }),
  searchPeople: async (query: string): Promise<AdminPeopleSearchResponse> => {
    const response = await apiRequest<{ source: 'cache' | 'tmdb'; results: Array<Omit<AdminPersonResult, 'id' | 'tmdb_id'> & { id: number; tmdb_id?: number }> }>(`/v1/admin/people/search?q=${encodeURIComponent(query)}&limit=10`, { credentials: 'include' })
    if (response.source === 'cache') return response as unknown as AdminPeopleSearchResponse
    return { ...response, results: response.results.map((person) => ({ ...person, id: undefined, tmdb_id: Number(person.id), source: 'tmdb' as const, profile_url: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null })) }
  },
  importPerson: (tmdbId: number) => apiRequest<AdminImportResponse>(`/v1/admin/people/${tmdbId}/import`, adminJson()),
  getCollaborators: (personId: string) => apiRequest<AdminCollaboratorsResponse>(`/v1/admin/people/${personId}/collaborators`, { credentials: 'include' }),
  createChallenge: (personId: string) => apiRequest<AdminChallengeResponse>('/v1/admin/challenges', adminJson({ featured_person_id: personId })),
  scheduleChallenge: (challengeId: string, date: string) => apiRequest<AdminChallengeResponse>(`/v1/admin/challenges/${challengeId}/schedule`, adminJson({ date }, 'PUT')),
  previewChallenge: (challengeId: string) => apiRequest<AdminPreview>(`/v1/admin/challenges/${challengeId}/refresh-preview`, adminJson()),
  publishChallenge: (challengeId: string) => apiRequest<AdminPublishResponse>(`/v1/admin/challenges/${challengeId}/publish`, adminJson()),
  getCalendar: (from: string, to: string) => apiRequest<AdminCalendarResponse>(`/v1/admin/challenges/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials: 'include' }),
}
