import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import { App } from './App'

const featured = { id: 'person-1', source: 'tmdb', tmdb_id: 880, name: 'Ben Affleck', profile_url: null }
const daily = { challenge: { id: 'challenge-1', number: 1, challenge_date: '2026-10-10', featured_person: featured, rules_version: 1, available_from: '2026-10-10T00:00:00Z', available_until: '2026-10-11T00:00:00Z' }, play: { id: 'play-1', state: 'choosing_collaborator', score: 0 }, server_time: '2026-10-10T12:00:00Z' }
const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

function renderApp(route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<MemoryRouter initialEntries={[route]}><QueryClientProvider client={client}><App /></QueryClientProvider></MemoryRouter>)
}

afterEach(() => vi.restoreAllMocks())

describe('application routes', () => {
  it('loads and restores the daily challenge', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => String(input).includes('/plays/') ? response({ play: daily.play }) : response(daily))
    renderApp()
    expect(await screen.findByRole('heading', { name: /ben affleck/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/film poster: starring ben affleck, with an unknown collaborator/i)).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: /actor, director/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders the admin placeholder', () => {
    renderApp('/admin')
    expect(screen.getByRole('heading', { name: /challenge control/i })).toBeInTheDocument()
  })

  it('renders a useful not-found page', () => {
    renderApp('/missing')
    expect(screen.getByRole('heading', { name: /page doesn’t exist/i })).toBeInTheDocument()
  })

  it('supports collaborator selection, project attempts and finishing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.includes('/challenges/daily')) return response(daily)
      if (url.endsWith('/plays/play-1') && !init?.method) return response({ play: daily.play })
      if (url.includes('/people/search')) return response({ people: [{ source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null, known_for: ['Good Will Hunting'] }] })
      if (url.endsWith('/collaborator')) return response({ play: { id: 'play-1', state: 'guessing_projects', score: 2, shared_project_count: 2, resolution_status: 'resolved' }, collaborator: { source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null }, shared_project_count: 2, guesses: [] })
      if (url.includes('/projects/search')) return response({ projects: [{ source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 }] })
      if (url.endsWith('/project-guesses')) return response({ guess: { id: 'guess-1', status: 'submitted', project: { source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 } }, play: { id: 'play-1', state: 'guessing_projects', resolution_status: 'resolved' } })
      if (url.endsWith('/finish')) return response({ play: { id: 'play-1', state: 'finished', score: 3, shared_project_count: 2, correct_guesses: 1 }, collaborator: { source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null }, guesses: [{ id: 'guess-1', status: 'correct', correct: true, outcome: 'both', symbol: '🎬', project: { source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 } }], result: { challenge_date: '2026-10-10', score: 3, shared_project_count: 2, correct_guesses: 1, incorrect_guesses: 0, share_text: 'Cinema Connects 🎬 3' }, missed_shared_projects: [] })
      return response({}, 404)
    })
    const user = userEvent.setup()
    renderApp()
    const people = await screen.findByRole('combobox', { name: /actor, director/i })
    await user.type(people, 'Matt')
    await user.click(await screen.findByRole('option', { name: /Matt Damon/i }, { timeout: 1500 }))
    await user.click(screen.getByRole('button', { name: /lock in collaborator/i }))
    expect(await screen.findByRole('heading', { name: /You picked Matt Damon/i })).toBeInTheDocument()
    const projects = screen.getByRole('combobox', { name: /shared film/i })
    await user.type(projects, 'Good Will')
    await user.click(await screen.findByRole('option', { name: /Good Will Hunting/i }, { timeout: 1500 }))
    await user.click(screen.getByRole('button', { name: /submit project/i }))
    expect(await screen.findByText('Good Will Hunting')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /shared film/i })).toHaveValue('')
    expect(screen.queryByText(/Both people are credited/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /can’t think/i }))
    expect(await screen.findByRole('heading', { name: /results/i })).toBeInTheDocument()
    expect(screen.getByText(/Both people are credited/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/finish'), expect.objectContaining({ method: 'POST' })))
  })

  it('polls pending answers until they settle and gates finishing', async () => {
    let playReads = 0
    const collaborator = { source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null }
    const project = { source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 }
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.includes('/challenges/daily')) return response(daily)
      if (url.endsWith('/plays/play-1') && !init?.method) {
        playReads += 1
        if (playReads === 1) return response({ play: daily.play })
        return response({ play: { id: 'play-1', state: 'guessing_projects', resolution_status: 'resolved' }, collaborator, guesses: [{ id: 'guess-1', status: 'submitted', project }] })
      }
      if (url.includes('/people/search')) return response({ people: [collaborator] })
      if (url.endsWith('/collaborator')) return response({ play: { id: 'play-1', state: 'guessing_projects', score: 0, resolution_status: 'pending' }, collaborator, guesses: [] })
      if (url.includes('/projects/search')) return response({ projects: [project] })
      if (url.endsWith('/project-guesses')) return response({ guess: { id: 'guess-1', status: 'submitted', project }, play: { id: 'play-1', state: 'guessing_projects', resolution_status: 'pending' } })
      return response({}, 404)
    })
    const user = userEvent.setup()
    renderApp()
    const people = await screen.findByRole('combobox', { name: /actor, director/i })
    await user.type(people, 'Matt')
    await user.click(await screen.findByRole('option', { name: /Matt Damon/i }))
    await user.click(screen.getByRole('button', { name: /lock in collaborator/i }))
    expect(await screen.findByText(/Checking their shared projects/i)).toBeInTheDocument()
    const projects = screen.getByRole('combobox', { name: /shared film/i })
    await user.type(projects, 'Good Will')
    await user.click(await screen.findByRole('option', { name: /Good Will Hunting/i }))
    await user.click(screen.getByRole('button', { name: /submit project/i }))
    expect(await screen.findByText('Good Will Hunting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /can’t think/i })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('button', { name: /can’t think/i })).toBeEnabled(), { timeout: 2500 })
    expect(screen.queryByText(/Both people are credited/)).not.toBeInTheDocument()
  })

  it('shows a retryable resolution failure and prevents finishing', async () => {
    const collaborator = { source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null }
    const failedPlay = { play: { id: 'play-1', state: 'guessing_projects', score: 0, resolution_status: 'failed' }, collaborator, guesses: [] }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.includes('/challenges/daily')) return response(daily)
      if (url.endsWith('/plays/play-1') && !init?.method) return response(failedPlay)
      if (url.endsWith('/resolution/retry')) return response({ ...failedPlay, play: { ...failedPlay.play, resolution_status: 'pending' } })
      return response({}, 404)
    })
    const user = userEvent.setup()
    renderApp()
    expect(await screen.findByText(/couldn’t check this collaboration/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /can’t think/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/resolution/retry'), expect.objectContaining({ method: 'POST' })))
  })
})
