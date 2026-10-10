import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, gameApi } from '../api/client'
import type { CollaboratorResponse, PersonSummary, PlayResponse, ProjectGuess, ProjectSummary } from '../api/types'
import { FlightPath } from '../components/FlightPath'
import { SearchPicker } from '../components/SearchPicker'

const requestKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

export function DailyGamePage() {
  const cache = useQueryClient()
  const [person, setPerson] = useState<PersonSummary | null>(null)
  const [project, setProject] = useState<ProjectSummary | null>(null)
  const [copied, setCopied] = useState(false)
  const daily = useQuery({ queryKey: ['daily-challenge'], queryFn: gameApi.getDaily, retry: false })
  const playId = daily.data?.play.id
  const resume = useQuery({ queryKey: ['play', playId], queryFn: () => gameApi.getPlay(playId!), enabled: Boolean(playId), retry: false })
  const playData: PlayResponse | undefined = resume.data ?? (daily.data ? { play: daily.data.play } : undefined)
  const play = playData?.play
  const collaborator = useMutation({ mutationFn: (choice: PersonSummary) => gameApi.submitCollaborator(playId!, choice, requestKey()), onSuccess: (data: CollaboratorResponse) => { cache.setQueryData(['play', playId], data); setPerson(null) } })
  const guess = useMutation({ mutationFn: (choice: ProjectSummary) => gameApi.submitProject(playId!, choice, requestKey()), onSuccess: (data) => { cache.setQueryData<PlayResponse>(['play', playId], (current) => ({ ...current, play: data.play, guesses: [...(current?.guesses ?? []), data.guess] })); setProject(null) } })
  const finish = useMutation({ mutationFn: () => gameApi.finish(playId!, requestKey()), onSuccess: (data) => cache.setQueryData(['play', playId], data) })

  if (daily.isPending) return <Status title="Preparing today’s flight" message="Loading the passenger manifest…" />
  if (daily.isError) {
    const absent = daily.error instanceof ApiError && daily.error.code === 'challenge_not_published'
    return <Status title={absent ? 'No flight today' : 'We hit some turbulence'} message={absent ? 'Today’s challenge hasn’t been published yet. Check back soon.' : 'We couldn’t load today’s challenge. Please refresh and try again.'} retry={() => daily.refetch()} />
  }

  const challenge = daily.data.challenge
  if (resume.isError) return <Status title="We lost your flight plan" message="Your saved game couldn’t be restored. Please try again before making another choice." retry={() => resume.refetch()} />
  const state = play?.state ?? 'COLLABORATOR_PENDING'
  const complete = state === 'COMPLETED' || state === 'COMPLETED_INCORRECT_COLLABORATOR'
  const stage: 0 | 1 | 2 = complete ? 2 : state === 'PROJECT_GUESSING' ? 1 : 0
  return <section className="game-page">
    <div className="sun-disc" aria-hidden="true" /><div className="cloud cloud-one" aria-hidden="true" /><div className="cloud cloud-two" aria-hidden="true" />
    <div className="game-intro"><p className="eyebrow">Today’s challenge · {challenge.challenge_date}</p><h1>Who flies well<br />with <em>{challenge.featured_person.name}?</em></h1><p className="lede">Name one person they’ve worked with, then recall every shared project you can.</p></div>
    <div className="challenge-card"><Portrait person={challenge.featured_person} /><div className="challenge-copy">
      {resume.isPending ? <p role="status">Restoring your flight…</p> : complete ? <Result playData={playData!} incorrectCollaborator={state === 'COMPLETED_INCORRECT_COLLABORATOR'} copied={copied} onShare={async () => { const text = (playData?.result ?? playData?.share)?.share_text ?? `Frequent Flyers ${challenge.challenge_date} ✈️ ${play?.score ?? 0}`; await navigator.clipboard?.writeText(text); setCopied(true) }} />
        : state === 'PROJECT_GUESSING' ? <ProjectRound playData={playData!} project={project} setProject={setProject} submitting={guess.isPending} finishing={finish.isPending} submit={() => project && guess.mutate(project)} finish={() => finish.mutate()} error={guess.error ?? finish.error} />
          : <CollaboratorRound featured={challenge.featured_person} person={person} setPerson={setPerson} submitting={collaborator.isPending} submit={() => person && collaborator.mutate(person)} error={collaborator.error} />}
    </div></div><FlightPath stage={stage} />
  </section>
}

function Portrait({ person }: { person: PersonSummary }) { return <div className="portrait">{person.profile_url ? <img src={person.profile_url} alt="" /> : <span>{initials(person.name)}</span>}</div> }

function CollaboratorRound({ featured, person, setPerson, submitting, submit, error }: { featured: PersonSummary; person: PersonSummary | null; setPerson: (value: PersonSummary | null) => void; submitting: boolean; submit: () => void; error: Error | null }) {
  return <><p className="card-kicker">Your one connection</p><h2>Choose a frequent collaborator</h2><p>Your choice locks after submission. Pick carefully—the more shared credits, the higher your possible score.</p>
    <SearchPicker label="Actor, director or screenwriter" placeholder="Start typing a name…" queryKey="people" selected={person} onSelect={setPerson} search={async (query) => (await gameApi.searchPeople(query)).people.filter((item) => item.tmdb_id !== featured.tmdb_id)} describe={(item) => ({ key: String(item.tmdb_id), title: item.name, detail: item.known_for?.join(' · ') || 'Film & television' })} />
    {person && <p className="selection-confirmation">Board with <strong>{person.name}</strong>? You only get one collaborator choice.</p>}{error && <InlineError error={error} />}<button className="primary-action" type="button" disabled={!person || submitting} onClick={submit}>{submitting ? 'Checking ticket…' : 'Lock in collaborator'}</button></>
}

function ProjectRound({ playData, project, setProject, submitting, finishing, submit, finish, error }: { playData: PlayResponse; project: ProjectSummary | null; setProject: (value: ProjectSummary | null) => void; submitting: boolean; finishing: boolean; submit: () => void; finish: () => void; error: Error | null }) {
  const guesses = playData.guesses ?? []
  return <><p className="card-kicker">Connection made · {playData.play.shared_project_count ?? 0} shared projects</p><h2>{playData.collaborator?.name ?? 'Your collaborator'} is on board</h2><p>Recall as many shared projects as you can. Wrong answers don’t cost points, so keep flying.</p>
    <SearchPicker label="Shared film or television project" placeholder="Search for a title…" queryKey="projects" selected={project} onSelect={setProject} disabled={submitting || finishing} search={async (query) => (await gameApi.searchProjects(query)).projects} describe={(item) => ({ key: `${item.media_type}-${item.tmdb_id}`, title: item.title, detail: [item.year, item.media_type === 'tv' ? 'TV' : 'Film'].filter(Boolean).join(' · ') })} />
    <button className="primary-action" type="button" disabled={!project || submitting || finishing} onClick={submit}>{submitting ? 'Checking credit…' : 'Submit project'}</button>{error && <InlineError error={error} />}<GuessHistory guesses={guesses} /><button className="finish-action" type="button" disabled={submitting || finishing} onClick={finish}>{finishing ? 'Landing…' : 'I can’t think of anything else'}</button></>
}

function GuessHistory({ guesses }: { guesses: ProjectGuess[] }) {
  if (!guesses.length) return <p className="empty-attempts">Your project attempts will appear here.</p>
  return <div className="attempts" aria-live="polite"><h3>Flight log</h3><ol>{guesses.map((entry) => <li className={entry.correct ? 'correct' : 'incorrect'} key={entry.id}><span aria-hidden="true">{entry.correct ? '✓' : '×'}</span><div><strong>{entry.project.title}</strong><small>{entry.project.year ?? 'Year unknown'} · {entry.correct ? 'Shared credit' : 'Not a shared credit'}</small></div></li>)}</ol></div>
}

function Result({ playData, incorrectCollaborator, copied, onShare }: { playData: PlayResponse; incorrectCollaborator: boolean; copied: boolean; onShare: () => void }) {
  const result = playData.result ?? playData.share
  return <div className="result-panel"><p className="card-kicker">Flight complete</p><h2>{incorrectCollaborator ? 'Connection missed' : 'You’ve landed!'}</h2><div className="score-stamp"><strong>{playData.play.score}</strong><span>points</span></div><p>{incorrectCollaborator ? 'That passenger didn’t share a qualifying project with today’s featured person.' : `${result?.correct_guesses ?? playData.play.correct_guesses ?? 0} correct project guesses from ${result?.shared_project_count ?? playData.play.shared_project_count ?? 0} shared credits.`}</p>{playData.guesses && <GuessHistory guesses={playData.guesses} />}{(playData.missed_shared_projects?.length ?? 0) > 0 && <details><summary>See missed shared projects</summary><ul className="missed-list">{playData.missed_shared_projects!.map((item) => <li key={`${item.media_type}-${item.tmdb_id}`}>{item.title} {item.year ? `(${item.year})` : ''}</li>)}</ul></details>}<button className="primary-action" type="button" onClick={onShare}>{copied ? 'Copied to clipboard!' : 'Copy result'}</button></div>
}

function InlineError({ error }: { error: Error }) { const duplicate = error instanceof ApiError && error.code === 'project_already_guessed'; return <p className="inline-error" role="alert">{duplicate ? 'That project is already in your flight log.' : error.message}</p> }
function Status({ title, message, retry }: { title: string; message: string; retry?: () => void }) { return <section className="utility-page"><p className="eyebrow">Frequent Flyers</p><h1>{title}</h1><p className="lede" role="status">{message}</p>{retry && <button className="primary-action" onClick={retry}>Try again</button>}</section> }
