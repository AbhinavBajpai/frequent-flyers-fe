export type PlayState = 'choosing_collaborator' | 'guessing_projects' | 'finished'
export type ResolutionStatus = 'pending' | 'resolved' | 'failed'
export type ProjectGuessStatus = 'submitted' | 'pending' | 'correct' | 'incorrect'
export type ProjectGuessOutcome = 'both' | 'one' | 'neither'
export interface PersonSummary { id?: string; source?: 'tmdb'; tmdb_id: number; name: string; profile_url: string | null; known_for?: string[]; known_for_department?: string | null }
export interface ProjectSummary { source: 'tmdb'; tmdb_id: number; media_type: 'movie' | 'tv'; title: string; year: number | null; poster_url?: string | null }
export interface Challenge { id: string; number: number; challenge_date: string; featured_person: PersonSummary; rules_version: number; available_from: string; available_until: string }
export interface PlaySummary { id: string; state: PlayState; score?: number; correct_guesses?: number; shared_project_count?: number; resolution_status?: ResolutionStatus | null }
export interface ProjectGuess { id: string; correct?: boolean | null; status?: ProjectGuessStatus; outcome?: ProjectGuessOutcome; symbol?: string; project: ProjectSummary }
export interface ShareResult { challenge_date: string; score: number; shared_project_count: number; correct_guesses: number; incorrect_guesses: number; share_text: string }
export interface DailyResponse { challenge: Challenge; play: PlaySummary; server_time: string }
export interface ArchiveChallenge { id: string; number: number; challenge_date: string; featured_person: PersonSummary; completed: boolean; play_state: PlayState | null; score: number | null }
export interface ArchiveResponse { challenges: ArchiveChallenge[] }
export interface AccountUser { id: string; email: string; is_admin: boolean }
export interface AuthResponse { user: AccountUser }
export interface FriendInviteResponse { invite: { token: string; expires_at: string } }
export interface FriendsResponse { friends: AccountUser[] }
export interface FriendResult { user: AccountUser; score: number; collaboration_count: number; correct_project_guesses: number; completed_at: string }
export interface FriendResultsResponse { results: FriendResult[] }
export interface PlayResponse { play: PlaySummary; collaborator?: PersonSummary | null; guesses?: ProjectGuess[]; missed_shared_projects?: ProjectSummary[]; result?: ShareResult; share?: ShareResult }
export interface CollaboratorResponse extends PlayResponse { shared_project_count?: number }
export interface ProjectGuessResponse { guess: ProjectGuess; play: PlaySummary }
export interface SearchPeopleResponse { people: PersonSummary[] }
export interface SearchProjectsResponse { projects: ProjectSummary[] }
export interface ApiErrorPayload { detail?: string; message?: string; error?: { code?: string; message?: string; details?: Record<string, unknown> } }

export interface AdminPersonResult extends Omit<PersonSummary, 'known_for'> {
  id?: string
  profile_path?: string | null
  known_for_department?: string | null
  known_for?: Array<{ title?: string; name?: string } | string>
}
export interface AdminPeopleSearchResponse { results: AdminPersonResult[]; source: 'cache' | 'tmdb' }
export interface AdminImportResponse { person: AdminPersonResult; qualified_projects: number }
export interface AdminCollaborator extends PersonSummary { id: string; shared_project_count: number }
export interface AdminCollaboratorsResponse { person: AdminPersonResult; collaborators: AdminCollaborator[] }
export type AdminChallengeStatus = 'draft' | 'scheduled' | 'published' | 'cancelled'
export interface AdminChallenge { id: string; status: AdminChallengeStatus; scheduled_date: string | null; featured_person: AdminPersonResult; rules_version: number }
export interface AdminChallengeResponse { challenge: AdminChallenge }
export interface AdminPreview { collaborator_count: number; project_pairs: number; counts: Record<string, number> }
export interface AdminPublishResponse extends AdminChallengeResponse { snapshot_projects: number }
export interface AdminCalendarDay { date: string; challenge: AdminChallenge | null }
export interface AdminCalendarResponse { days: AdminCalendarDay[] }
