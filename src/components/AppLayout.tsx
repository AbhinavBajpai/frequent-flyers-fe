import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'

export function AppLayout() {
  const cache = useQueryClient()
  const navigate = useNavigate()
  const account = useQuery({ queryKey: ['account'], queryFn: authApi.me, retry: false })
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      cache.setQueryData(['account'], null)
      await cache.invalidateQueries({ queryKey: ['challenge-archive'] })
      navigate('/')
    },
  })
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="wordmark" to="/" aria-label="Cinema Connects home">
          <span className="wordmark-mark" aria-hidden="true">✦</span>
          <span>Cinema Connects</span>
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>Today</NavLink>
          <NavLink to="/archive">Archive</NavLink>
          {account.data?.is_admin && <NavLink to="/admin">Admin</NavLink>}
          {account.data ? <>
            <NavLink to="/friends">Friends</NavLink>
            <NavLink to="/account" aria-label={`Account for ${account.data.email}`}>Account</NavLink>
            <button className="nav-button" disabled={logout.isPending} onClick={() => logout.mutate()}>Log out</button>
          </> : <NavLink to="/account">Log in</NavLink>}
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <span>A daily game of cinematic connections.</span>
        <span aria-hidden="true">A new collaboration every day</span>
      </footer>
    </div>
  )
}
