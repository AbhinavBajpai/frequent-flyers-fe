import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, ApiError, authApi } from '../api/client'
import type { AdminChallenge, AdminImportResponse, AdminPersonResult } from '../api/types'

function isoDate(offset = 0) { const value = new Date(); value.setUTCDate(value.getUTCDate() + offset); return value.toISOString().slice(0, 10) }
function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.' }
function knownFor(person: AdminPersonResult) {
  return person.known_for?.map((item) => typeof item === 'string' ? item : item.title ?? item.name).filter(Boolean).slice(0, 3).join(', ')
    || person.known_for_department || 'Person'
}

export function AdminPage() {
  const queryClient = useQueryClient()
  const account = useQuery({ queryKey: ['account'], queryFn: authApi.me, retry: false })
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<AdminImportResponse | null>(null)
  const [challenge, setChallenge] = useState<AdminChallenge | null>(null)
  const [scheduleDate, setScheduleDate] = useState(isoDate(1))
  const [from, setFrom] = useState(isoDate())
  const [to, setTo] = useState(isoDate(13))
  const [notice, setNotice] = useState('')

  const search = useQuery({ queryKey: ['admin', 'people', searchTerm], queryFn: () => adminApi.searchPeople(searchTerm), enabled: Boolean(account.data?.is_admin && searchTerm.length >= 2), retry: false })
  const collaborators = useQuery({ queryKey: ['admin', 'collaborators', selected?.person.id], queryFn: () => adminApi.getCollaborators(selected!.person.id!), enabled: Boolean(account.data?.is_admin && selected?.person.id), retry: false })
  const calendar = useQuery({ queryKey: ['admin', 'calendar', from, to], queryFn: () => adminApi.getCalendar(from, to), enabled: Boolean(account.data?.is_admin && from && to && to >= from), retry: false })
  const importPerson = useMutation({ mutationFn: (person: AdminPersonResult) => adminApi.importPerson(person.tmdb_id), onSuccess: (data) => { setSelected(data); setChallenge(null); setNotice(`${data.person.name} imported with ${data.qualified_projects} qualifying credits.`) } })
  const createChallenge = useMutation({ mutationFn: () => adminApi.createChallenge(selected!.person.id!), onSuccess: ({ challenge: next }) => { setChallenge(next); setNotice('Draft challenge created.') } })
  const schedule = useMutation({ mutationFn: () => adminApi.scheduleChallenge(challenge!.id, scheduleDate), onSuccess: ({ challenge: next }) => { setChallenge(next); setNotice(`Challenge scheduled for ${scheduleDate}.`); void queryClient.invalidateQueries({ queryKey: ['admin', 'calendar'] }) } })
  const preview = useMutation({ mutationFn: () => adminApi.previewChallenge(challenge!.id) })
  const publish = useMutation({ mutationFn: () => adminApi.publishChallenge(challenge!.id), onSuccess: ({ challenge: next, snapshot_projects: count }) => { setChallenge(next); setNotice(`Challenge published with ${count} project pairs.`); void queryClient.invalidateQueries({ queryKey: ['admin', 'calendar'] }) } })

  function searchPeople(event: FormEvent) { event.preventDefault(); setSearchTerm(searchInput.trim()) }
  function chooseCached(person: AdminPersonResult) { setSelected({ person: { ...person, source: 'tmdb' }, qualified_projects: 0 }); setChallenge(null); setNotice(`${person.name} is already in the local catalogue.`) }

  if (account.isPending) return <section className="utility-page admin-page"><p role="status">Checking access…</p></section>
  if (!account.data?.is_admin) return <section className="utility-page admin-page"><p className="eyebrow">Restricted</p><h1>Access denied</h1><p className="lede">You need an administrator account to open challenge control.</p><Link className="text-action" to="/account">Log in</Link></section>

  const actionError = importPerson.error || createChallenge.error || schedule.error || preview.error || publish.error
  return <section className="utility-page admin-page">
    <header className="admin-heading"><div><p className="eyebrow">Operations desk</p><h1>Challenge control</h1><p className="lede">Discover talent, inspect their routes, then schedule and publish a daily challenge.</p></div></header>
    {notice && <p className="admin-alert success" role="status">✓ {notice}</p>}
    {actionError && <p className="admin-alert error" role="alert">{message(actionError)}</p>}
    <div className="admin-grid">
      <section className="admin-panel" aria-labelledby="discover-heading">
        <p className="step-label">Step 1</p><h2 id="discover-heading">Discover a featured person</h2>
        <form onSubmit={searchPeople}><label htmlFor="person-search">Name</label><div className="input-row"><input id="person-search" value={searchInput} minLength={2} onChange={(event) => setSearchInput(event.target.value)} placeholder="e.g. Ben Affleck" required /><button type="submit">Search</button></div></form>
        {search.isFetching && <p className="admin-status" role="status">Searching the catalogue…</p>}{search.error && <p className="admin-alert error" role="alert">{message(search.error)}</p>}
        {search.data && <p className="source-note">Results from {search.data.source === 'tmdb' ? 'TMDB' : 'the local cache'}</p>}{search.data?.results.length === 0 && <p className="admin-status">No people found. Try a fuller name.</p>}
        <ul className="people-results">{search.data?.results.map((person) => <li key={person.tmdb_id}>
          {(person.profile_url || person.profile_path) ? <img src={person.profile_url ?? `https://image.tmdb.org/t/p/w185${person.profile_path}`} alt="" /> : <span className="avatar-placeholder" aria-hidden="true">{person.name.slice(0, 1)}</span>}
          <div><strong>{person.name}</strong><small>{knownFor(person)}</small></div><button disabled={importPerson.isPending} onClick={() => person.id ? chooseCached(person) : importPerson.mutate(person)}>{person.id ? 'Select' : importPerson.isPending ? 'Importing…' : 'Import'}</button>
        </li>)}</ul>
      </section>
      <section className="admin-panel" aria-labelledby="inspect-heading">
        <p className="step-label">Step 2</p><h2 id="inspect-heading">Inspect collaborations</h2>
        {!selected && <p className="admin-empty">Select or import a person to see their strongest collaborators.</p>}
        {selected && <div className="selected-person"><strong>{selected.person.name}</strong><span>{selected.qualified_projects ? `${selected.qualified_projects} qualifying credits imported` : 'Local catalogue record'}</span></div>}
        {collaborators.isFetching && <p className="admin-status" role="status">Calculating shared projects…</p>}{collaborators.error && <p className="admin-alert error" role="alert">{message(collaborators.error)}</p>}
        {collaborators.data?.collaborators.length === 0 && <p className="admin-empty">No qualifying collaborators yet. Importing collaborator credits will expand this list.</p>}
        <ol className="collaborator-list">{collaborators.data?.collaborators.slice(0, 12).map((person) => <li key={person.id}><span>{person.name}</span><strong>{person.shared_project_count} shared</strong></li>)}</ol>
      </section>
      <section className="admin-panel admin-workflow" aria-labelledby="prepare-heading">
        <p className="step-label">Step 3</p><h2 id="prepare-heading">Prepare challenge</h2>
        {!selected && <p className="admin-empty">Choose a featured person first.</p>}
        {selected && !challenge && <button className="panel-action" disabled={createChallenge.isPending || !selected.person.id} onClick={() => createChallenge.mutate()}>{createChallenge.isPending ? 'Creating…' : 'Create draft challenge'}</button>}
        {challenge && <><div className="challenge-state"><span>Status</span><strong>{challenge.status}</strong></div><label htmlFor="schedule-date">UTC challenge date</label>
          <div className="input-row"><input id="schedule-date" type="date" value={scheduleDate} disabled={challenge.status === 'published'} onChange={(event) => setScheduleDate(event.target.value)} /><button disabled={schedule.isPending || challenge.status === 'published'} onClick={() => schedule.mutate()}>{schedule.isPending ? 'Saving…' : 'Schedule'}</button></div>
          <div className="admin-action-row"><button className="secondary-button" disabled={preview.isPending || challenge.status === 'published'} onClick={() => preview.mutate()}>{preview.isPending ? 'Refreshing…' : 'Refresh preview'}</button><button disabled={publish.isPending || challenge.status !== 'scheduled'} onClick={() => publish.mutate()}>{publish.isPending ? 'Publishing…' : 'Publish challenge'}</button></div>
          {preview.data && <div className="preview-card" role="status"><strong>{preview.data.collaborator_count} cached collaborators</strong><span>{preview.data.project_pairs} shared project pairs are currently cached. New answers are checked when played.</span></div>}</>}
      </section>
    </div>
    <section className="admin-panel calendar-panel" aria-labelledby="calendar-heading">
      <div className="calendar-heading"><div><p className="step-label">Schedule overview</p><h2 id="calendar-heading">Challenge calendar</h2></div><div className="date-range"><label>From<input aria-label="Calendar from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input aria-label="Calendar to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div></div>
      {to < from && <p className="admin-alert error" role="alert">The end date must be on or after the start date.</p>}{calendar.isFetching && <p className="admin-status" role="status">Loading challenges…</p>}
      {calendar.error && <p className="admin-alert error" role="alert">{calendar.error instanceof ApiError && calendar.error.status === 403 ? 'Your account no longer has administrator access.' : message(calendar.error)}</p>}
      <div className="calendar-grid">{calendar.data?.days.map((day) => <article key={day.date} className={day.challenge ? `calendar-day ${day.challenge.status}` : 'calendar-day gap'}><time dateTime={day.date}>{new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })}</time>{day.challenge ? <><strong>{day.challenge.featured_person.name}</strong><span>{day.challenge.status}</span></> : <><strong>Open date</strong><span>Needs challenge</span></>}</article>)}</div>
    </section>
  </section>
}
