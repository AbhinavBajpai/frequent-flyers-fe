import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

describe('application routes', () => {
  it('renders the daily challenge shell', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /who flies well.*ben affleck/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders the admin placeholder', () => {
    render(<MemoryRouter initialEntries={['/admin']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /challenge control/i })).toBeInTheDocument()
  })

  it('renders a useful not-found page', () => {
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /route isn’t on the board/i })).toBeInTheDocument()
  })
})
