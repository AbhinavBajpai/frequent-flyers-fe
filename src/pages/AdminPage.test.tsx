import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, vi } from 'vitest'
import { App } from '../App'

const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const person = { id: 'person-1', tmdb_id: 880, name: 'Ben Affleck', profile_url: null, known_for_department: 'Acting' }
const draft = { id: 'challenge-1', status: 'draft', scheduled_date: null, featured_person: person, rules_version: 1 }

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<MemoryRouter initialEntries={['/admin']}><QueryClientProvider client={client}><App /></QueryClientProvider></MemoryRouter>)
}

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks() })

it('runs the admin discovery, scheduling, preview and publish workflow', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input)
    if (url.includes('/calendar')) return response({ days: [{ date: '2026-10-10', challenge: null }] })
    if (url.includes('/people/search')) return response({ source: 'tmdb', results: [{ id: 880, name: 'Ben Affleck', known_for_department: 'Acting', profile_path: null }] })
    if (url.endsWith('/people/880/import')) return response({ person, qualified_projects: 42 })
    if (url.endsWith('/collaborators')) return response({ person, collaborators: [{ id: 'person-2', tmdb_id: 1892, name: 'Matt Damon', profile_url: null, shared_project_count: 9 }] })
    if (url.endsWith('/admin/challenges') && init?.method === 'POST') return response({ challenge: draft }, 201)
    if (url.endsWith('/schedule')) return response({ challenge: { ...draft, status: 'scheduled', scheduled_date: '2026-10-11' } })
    if (url.endsWith('/refresh-preview')) return response({ collaborator_count: 18, project_pairs: 57, counts: {} })
    if (url.endsWith('/publish')) return response({ challenge: { ...draft, status: 'published', scheduled_date: '2026-10-11' }, snapshot_projects: 57 })
    return response({ error: { message: 'Not found' } }, 404)
  })
  const user = userEvent.setup()
  renderAdmin()
  await user.type(screen.getByLabelText(/admin api key/i), 'secret')
  await user.click(screen.getByRole('button', { name: /open desk/i }))
  expect(await screen.findByText(/open date/i)).toBeInTheDocument()
  await user.type(screen.getByLabelText(/^name$/i), 'Ben Affleck')
  await user.click(screen.getByRole('button', { name: /^search$/i }))
  await user.click(await screen.findByRole('button', { name: /^import$/i }))
  expect(await screen.findByText(/42 qualifying credits imported/i)).toBeInTheDocument()
  expect(await screen.findByText(/Matt Damon/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /create draft challenge/i }))
  expect(await screen.findByText(/^draft$/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /^schedule$/i }))
  expect(await screen.findByText(/^scheduled$/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /refresh preview/i }))
  expect(await screen.findByText(/18 cached collaborators/i)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /publish challenge/i }))
  expect(await screen.findByText(/published with 57 project pairs/i)).toBeInTheDocument()
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/publish'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-Admin-Key': 'secret' }) })))
})
