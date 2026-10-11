import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authApi, gameApi } from '../api/client'

export function ArchivePage() {
  const archive = useQuery({ queryKey: ['challenge-archive'], queryFn: gameApi.getArchive, retry: false })
  const account = useQuery({ queryKey: ['account'], queryFn: authApi.me, retry: false })

  return <section className="utility-page archive-page">
    <p className="eyebrow">Past challenges</p>
    <h1>Archive</h1>
    <p className="lede">Play an earlier Cinema Connects challenge or revisit one you’ve completed.</p>
    {!account.isPending && !account.data && <aside className="archive-account-note"><p><strong>Want your history on every device?</strong> Log in or create an account and we’ll add games played in this browser.</p><Link className="text-action" to="/account">Save my progress</Link></aside>}
    {archive.isPending && <p role="status">Loading the archive…</p>}
    {archive.isError && <p className="inline-error" role="alert">We couldn’t load the archive. Please try again.</p>}
    {archive.data?.challenges.length === 0 && <p className="archive-empty">There aren’t any earlier challenges yet.</p>}
    <div className="archive-grid">{archive.data?.challenges.map((challenge) =>
      <Link className={`archive-card${challenge.completed ? ' completed' : ''}`} to={`/challenges/${challenge.id}`} key={challenge.id}>
        <span>#{challenge.number} · {new Date(`${challenge.challenge_date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <strong>{challenge.featured_person.name}</strong>
        <small>{challenge.completed ? `Completed${challenge.score === null ? '' : ` · ${challenge.score}pts`}` : challenge.play_state ? 'Continue playing' : 'Play challenge'}</small>
      </Link>
    )}</div>
  </section>
}
