import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../App'

const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
}))

afterEach(() => vi.restoreAllMocks())

it('lists friends and creates a private invitation link', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input)
    if (url.endsWith('/auth/me')) return response({ user: { id: 'me', email: 'me@example.com', is_admin: false } })
    if (url.endsWith('/friends') && !init?.method) return response({ friends: [{ id: 'friend', email: 'friend@example.com', is_admin: false }] })
    if (url.endsWith('/friends/invites') && init?.method === 'POST') return response({ invite: { token: 'private-token', expires_at: '2026-10-18T00:00:00Z' } }, 201)
    return response({ error: { message: 'Not found' } }, 404)
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/friends']}><QueryClientProvider client={client}><App /></QueryClientProvider></MemoryRouter>)

  expect(await screen.findByText('friend@example.com')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /create invite link/i }))
  expect((await screen.findByLabelText(/friend invite link/i) as HTMLInputElement).value).toContain('/friends/invite/private-token')
})
