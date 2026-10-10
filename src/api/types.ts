export type PlayState = 'COLLABORATOR_PENDING' | 'PROJECT_GUESSING' | 'COMPLETED' | 'COMPLETED_INCORRECT_COLLABORATOR'
export interface PersonSummary { id?: string; source: 'tmdb'; tmdb_id: number; name: string; profile_url: string | null; known_for?: string[] }
export interface ProjectSummary { source: 'tmdb'; tmdb_id: number; media_type: 'movie' | 'tv'; title: string; year: number | null; poster_url?: string | null }
export interface Challenge { id: string; challenge_date: string; featured_person: PersonSummary; rules_version: number; available_from: string; available_until: string }
export interface PlaySummary { id: string; state: PlayState; score: number; correct_guesses?: number; shared_project_count?: number }
export interface ProjectGuess { id: string; correct: boolean; project: ProjectSummary }
export interface ShareResult { challenge_date: string; score: number; shared_project_count: number; correct_guesses: number; incorrect_guesses: number; share_text: string }
export interface DailyResponse { challenge: Challenge; play: PlaySummary; server_time: string }
export interface PlayResponse { play: PlaySummary; collaborator?: PersonSummary | null; guesses?: ProjectGuess[]; missed_shared_projects?: ProjectSummary[]; result?: ShareResult; share?: ShareResult }
export interface CollaboratorResponse extends PlayResponse { shared_project_count?: number }
export interface ProjectGuessResponse { guess: ProjectGuess; play: PlaySummary }
export interface SearchPeopleResponse { people: PersonSummary[] }
export interface SearchProjectsResponse { projects: ProjectSummary[] }
export interface ApiErrorPayload { detail?: string; message?: string; error?: { code?: string; message?: string; details?: Record<string, unknown> } }
