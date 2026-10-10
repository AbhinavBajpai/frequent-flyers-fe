import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, gameApi } from '../api/client'
import type { CollaboratorResponse, PersonSummary, PlayResponse, ProjectGuess, ProjectSummary } from '../api/types'
import { FlightPath } from '../components/FlightPath'
import { SearchPicker } from '../components/SearchPicker'

const requestKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const headlineVariants = [
  (name: string) => `Who is ${name}’s fave?`,
  (name: string) => `Who answers immediately when ${name} calls?`,
  (name: string) => `Who is always in ${name}’s contacts?`,
  (name: string) => `Who keeps working with ${name}?`,
  (name: string) => `Who is ${name}’s go-to?`,
  (name: string) => `Who always gets the call from ${name}?`,
  (name: string) => `Who has shared the most credits with ${name}?`,
  (name: string) => `Who turns up alongside ${name} again and again?`,
  (name: string) => `Who makes the best double act with ${name}?`,
  (name: string) => `Who is never far from ${name}’s next project?`,
]

export function DailyGamePage() {
  const cache = useQueryClient()
  const [person, setPerson] = useState<PersonSummary | null>(null)
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [copied, setCopied] = useState(false)
  const [headlineIndex] = useState(() => Math.floor(Math.random() * headlineVariants.length))
  const daily = useQuery({ queryKey: ['daily-challenge'], queryFn: gameApi.getDaily, retry: false })
  const playId = daily.data?.play.id
  const resume = useQuery({
    queryKey: ['play', playId],
    queryFn: () => gameApi.getPlay(playId!),
    enabled: Boolean(playId),
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data
      const resolutionPending = data?.play.resolution_status === 'pending'
      return resolutionPending ? 1_000 : false
    },
  })
  const playData: PlayResponse | undefined = resume.data ?? (daily.data ? { play: daily.data.play } : undefined)
  const play = playData?.play
  const collaborator = useMutation({ mutationFn: (choice: PersonSummary) => gameApi.submitCollaborator(playId!, choice, requestKey()), onSuccess: (data: CollaboratorResponse) => { cache.setQueryData(['play', playId], data); setPerson(null) } })
  const guess = useMutation({ mutationFn: (choice: ProjectSummary) => gameApi.submitProject(playId!, choice, requestKey()), onSuccess: (data) => { cache.setQueryData<PlayResponse>(['play', playId], (current) => ({ ...current, play: data.play, guesses: [...(current?.guesses ?? []), data.guess] })); setProject(null) } })
  const retryResolution = useMutation({ mutationFn: () => gameApi.retryResolution(playId!), onSuccess: (data) => cache.setQueryData(['play', playId], data) })
  const finish = useMutation({ mutationFn: () => gameApi.finish(playId!, requestKey()), onSuccess: (data) => cache.setQueryData(['play', playId], data) })

  if (daily.isPending) return <Status title="Preparing today’s flight" message="Loading the passenger manifest…" />
  if (daily.isError) {
    const absent = daily.error instanceof ApiError && daily.error.code === 'challenge_not_published'
    return <Status title={absent ? 'No flight today' : 'We hit some turbulence'} message={absent ? 'Today’s challenge hasn’t been published yet. Check back soon.' : 'We couldn’t load today’s challenge. Please refresh and try again.'} retry={() => daily.refetch()} />
  }

  const challenge = daily.data.challenge
  if (resume.isError) return <Status title="We lost your flight plan" message="Your saved game couldn’t be restored. Please try again before making another choice." retry={() => resume.refetch()} />
  const state = play?.state ?? 'choosing_collaborator'
  const complete = state === 'finished'
  const incorrectCollaborator = complete && play?.shared_project_count === 0
  const stage: 0 | 1 | 2 = complete ? 2 : state === 'guessing_projects' ? 1 : 0
  return <section className="game-page">
    <div className="sun-disc" aria-hidden="true" /><div className="cloud cloud-one" aria-hidden="true" /><div className="cloud cloud-two" aria-hidden="true" />
    <div className="game-intro"><p className="eyebrow">Today’s challenge · {challenge.challenge_date}</p><h1>{headlineVariants[headlineIndex](challenge.featured_person.name)}</h1><p className="lede">Name one person they’ve worked with, then recall every shared project you can.</p></div>
    <div className="challenge-card"><FilmPoster person={challenge.featured_person} /><div className="challenge-copy">
      {resume.isPending ? <p role="status">Restoring your flight…</p> : complete ? <Result playData={playData!} incorrectCollaborator={incorrectCollaborator} copied={copied} onShare={async () => { const text = (playData?.result ?? playData?.share)?.share_text ?? `Cinema Connects ${challenge.challenge_date} 🎬 ${play?.score ?? 0}`; await navigator.clipboard?.writeText(text); setCopied(true) }} />
        : state === 'guessing_projects' ? <ProjectRound playData={playData!} project={project} setProject={setProject} submitting={guess.isPending} finishing={finish.isPending} retrying={retryResolution.isPending} retry={() => retryResolution.mutate()} submit={() => project && guess.mutate(project)} finish={() => finish.mutate()} error={guess.error ?? retryResolution.error ?? finish.error} />
          : <CollaboratorRound featured={challenge.featured_person} person={person} setPerson={setPerson} submitting={collaborator.isPending} submit={() => person && collaborator.mutate(person)} error={collaborator.error} />}
    </div></div><FlightPath stage={stage} />
  </section>
}

function FilmPoster({ person }: { person: PersonSummary }) {
  const department = person.known_for_department?.toLowerCase()
  const billing = department === 'directing' ? 'Directed by' : department === 'writing' ? 'Written by' : 'Starring'
  return <aside className="film-poster" aria-label={`Film poster: ${billing} ${person.name}, with an unknown collaborator`}>
    <p className="poster-presents">A Cinema Connects picture</p>
    <div className="poster-art" aria-hidden="true"><i /><i /><span>?</span></div>
    <div className="poster-billing"><small>{billing}</small><strong>{person.name}</strong><b>with…</b></div>
  </aside>
}

function CollaboratorRound({ featured, person, setPerson, submitting, submit, error }: { featured: PersonSummary; person: PersonSummary | null; setPerson: (value: PersonSummary | null) => void; submitting: boolean; submit: () => void; error: Error | null }) {
  return <><p className="card-kicker">Your one connection</p><h2>Choose a frequent collaborator</h2><p>Your choice locks after submission. Pick carefully—the more shared credits, the higher your possible score.</p>
    <SearchPicker label="Actor, director or screenwriter" placeholder="Start typing a name…" queryKey="people" selected={person} onSelect={setPerson} search={async (query) => (await gameApi.searchPeople(query)).people.filter((item) => item.tmdb_id !== featured.tmdb_id)} describe={(item) => ({ key: String(item.tmdb_id), title: item.name, detail: item.known_for?.join(' · ') || 'Film & television' })} />
    {person && <p className="selection-confirmation">Happy with <strong>{person.name}</strong>? You only get one choice.</p>}{error && <InlineError error={error} />}<button className="primary-action" type="button" disabled={!person || submitting} onClick={submit}>{submitting ? 'Checking ticket…' : 'Lock in collaborator'}</button></>
}

function ProjectRound({ playData, project, setProject, submitting, finishing, retrying, retry, submit, finish, error }: { playData: PlayResponse; project: ProjectSummary | null; setProject: (value: ProjectSummary | null) => void; submitting: boolean; finishing: boolean; retrying: boolean; retry: () => void; submit: () => void; finish: () => void; error: Error | null }) {
  const guesses = playData.guesses ?? []
  const resolution = playData.play.resolution_status
  const pending = resolution === 'pending'
  const failed = resolution === 'failed'
  return <><p className="card-kicker">{resolution === 'resolved' || resolution === undefined ? 'Connection ready' : 'Connection selected'}</p><h2>{playData.collaborator?.name ?? 'Your collaborator'} is on board</h2><p>Recall as many shared projects as you can. Your answers will be revealed when you finish.</p>
    {resolution === 'pending' && <p className="selection-confirmation" role="status">Checking their shared projects — keep guessing.</p>}
    {failed && <div><p className="inline-error" role="alert">We couldn’t check this collaboration. Your answers are saved.</p><button className="finish-action" type="button" disabled={retrying} onClick={retry}>{retrying ? 'Trying again…' : 'Try again'}</button></div>}
    <SearchPicker label="Shared film or television project" placeholder="Search for a title…" queryKey="projects" selected={project} onSelect={setProject} disabled={submitting || finishing} search={async (query) => (await gameApi.searchProjects(query)).projects} describe={(item) => ({ key: `${item.media_type}-${item.tmdb_id}`, title: item.title, detail: [item.year, item.media_type === 'tv' ? 'TV' : 'Film'].filter(Boolean).join(' · ') })} />
    <button className="primary-action" type="button" disabled={!project || submitting || finishing} onClick={submit}>{submitting ? 'Adding project…' : 'Submit project'}</button>{error && <InlineError error={error} />}<GuessHistory guesses={guesses} /><button className="finish-action" type="button" disabled={submitting || finishing || pending || failed} aria-describedby={pending || failed ? 'finish-wait-reason' : undefined} onClick={finish}>{finishing ? 'Landing…' : 'I can’t think of anything else'}</button>{(pending || failed) && <p id="finish-wait-reason" className="empty-attempts" role="status">{failed ? 'Try the collaboration check again before finishing.' : 'You can finish once the collaboration check is complete.'}</p>}</>
}

function GuessHistory({ guesses }: { guesses: ProjectGuess[] }) {
  if (!guesses.length) return <p className="empty-attempts">Your project attempts will appear here.</p>
  return <div className="attempts" aria-live="polite"><h3>Flight log</h3><ol>{guesses.map((entry) => {
    const result = entry.outcome === 'both' ? { symbol: '🎬', label: 'Both people are credited' } : entry.outcome === 'one' ? { symbol: '🎟', label: 'Only one person is credited' } : entry.outcome === 'neither' ? { symbol: '🎞', label: 'Neither person is credited' } : null
    return <li className={result ? `outcome-${entry.outcome}` : 'submitted'} key={entry.id}>{result && <span aria-hidden="true">{result.symbol}</span>}<div><strong>{entry.project.title}</strong><small>{entry.project.year ?? 'Year unknown'}{result ? ` · ${result.label}` : ''}</small></div></li>
  })}</ol></div>
}

function Result({ playData, incorrectCollaborator, copied, onShare }: { playData: PlayResponse; incorrectCollaborator: boolean; copied: boolean; onShare: () => void }) {
  const result = playData.result ?? playData.share
  return <div className="result-panel"><p className="card-kicker">Flight complete</p><h2>{incorrectCollaborator ? 'Connection missed' : 'You’ve landed!'}</h2>{playData.guesses && <GuessHistory guesses={playData.guesses} />}<div className="score-stamp"><strong>{playData.play.score}</strong><span>points</span></div><p>{incorrectCollaborator ? 'That passenger didn’t share a qualifying project with today’s featured person.' : `${result?.correct_guesses ?? playData.play.correct_guesses ?? 0} correct project guesses from ${result?.shared_project_count ?? playData.play.shared_project_count ?? 0} shared credits.`}</p>{(playData.missed_shared_projects?.length ?? 0) > 0 && <details><summary>See missed shared projects</summary><ul className="missed-list">{playData.missed_shared_projects!.map((item) => <li key={`${item.media_type}-${item.tmdb_id}`}>{item.title} {item.year ? `(${item.year})` : ''}</li>)}</ul></details>}<button className="primary-action" type="button" onClick={onShare}>{copied ? 'Copied to clipboard!' : 'Copy result'}</button></div>
}

function InlineError({ error }: { error: Error }) { const duplicate = error instanceof ApiError && error.code === 'project_already_guessed'; return <p className="inline-error" role="alert">{duplicate ? 'That project is already in your flight log.' : error.message}</p> }
function Status({ title, message, retry }: { title: string; message: string; retry?: () => void }) { return <section className="utility-page"><p className="eyebrow">Cinema Connects</p><h1>{title}</h1><p className="lede" role="status">{message}</p>{retry && <button className="primary-action" onClick={retry}>Try again</button>}</section> }
