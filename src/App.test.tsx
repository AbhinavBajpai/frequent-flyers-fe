import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import { App } from './App'

const featured = { id: 'person-1', source: 'tmdb', tmdb_id: 880, name: 'Ben Affleck', profile_url: null }
const daily = { challenge: { id: 'challenge-1', challenge_date: '2026-10-10', featured_person: featured, rules_version: 1, available_from: '2026-10-10T00:00:00Z', available_until: '2026-10-11T00:00:00Z' }, play: { id: 'play-1', state: 'COLLABORATOR_PENDING', score: 0 }, server_time: '2026-10-10T12:00:00Z' }
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
    expect(await screen.findByRole('heading', { name: /who flies well.*ben affleck/i })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: /actor, director/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders the admin placeholder', () => {
    renderApp('/admin')
    expect(screen.getByRole('heading', { name: /challenge control/i })).toBeInTheDocument()
  })

  it('renders a useful not-found page', () => {
    renderApp('/missing')
    expect(screen.getByRole('heading', { name: /route isn’t on the board/i })).toBeInTheDocument()
  })

  it('supports collaborator selection, project attempts and finishing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.includes('/challenges/daily')) return response(daily)
      if (url.endsWith('/plays/play-1') && !init?.method) return response({ play: daily.play })
      if (url.includes('/people/search')) return response({ people: [{ source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null, known_for: ['Good Will Hunting'] }] })
      if (url.endsWith('/collaborator')) return response({ play: { id: 'play-1', state: 'PROJECT_GUESSING', score: 2, shared_project_count: 2 }, collaborator: { source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null }, shared_project_count: 2, guesses: [] })
      if (url.includes('/projects/search')) return response({ projects: [{ source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 }] })
      if (url.endsWith('/project-guesses')) return response({ guess: { id: 'guess-1', correct: true, project: { source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 } }, play: { id: 'play-1', state: 'PROJECT_GUESSING', score: 3, shared_project_count: 2, correct_guesses: 1 } })
      if (url.endsWith('/finish')) return response({ play: { id: 'play-1', state: 'COMPLETED', score: 3, shared_project_count: 2, correct_guesses: 1 }, collaborator: { source: 'tmdb', tmdb_id: 1892, name: 'Matt Damon', profile_url: null }, guesses: [{ id: 'guess-1', correct: true, project: { source: 'tmdb', tmdb_id: 489, media_type: 'movie', title: 'Good Will Hunting', year: 1997 } }], result: { challenge_date: '2026-10-10', score: 3, shared_project_count: 2, correct_guesses: 1, incorrect_guesses: 0, share_text: 'Frequent Flyers ✈️ 3' }, missed_shared_projects: [] })
      return response({}, 404)
    })
    const user = userEvent.setup()
    renderApp()
    const people = await screen.findByRole('combobox', { name: /actor, director/i })
    await user.type(people, 'Matt')
    await user.click(await screen.findByRole('option', { name: /Matt Damon/i }, { timeout: 1500 }))
    await user.click(screen.getByRole('button', { name: /lock in collaborator/i }))
    expect(await screen.findByRole('heading', { name: /Matt Damon is on board/i })).toBeInTheDocument()
    const projects = screen.getByRole('combobox', { name: /shared film/i })
    await user.type(projects, 'Good Will')
    await user.click(await screen.findByRole('option', { name: /Good Will Hunting/i }, { timeout: 1500 }))
    await user.click(screen.getByRole('button', { name: /submit project/i }))
    expect(await screen.findByText(/Shared credit/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /can’t think/i }))
    expect(await screen.findByRole('heading', { name: /landed/i })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/finish'), expect.objectContaining({ method: 'POST' })))
  })
})
