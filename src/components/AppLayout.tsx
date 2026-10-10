import { NavLink, Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="wordmark" to="/" aria-label="Frequent Flyers home">
          <span className="wordmark-mark" aria-hidden="true">✦</span>
          <span>Frequent Flyers</span>
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>Today</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <span>A daily game of cinematic connections.</span>
        <span aria-hidden="true">New departure every day · UTC</span>
      </footer>
    </div>
  )
}
