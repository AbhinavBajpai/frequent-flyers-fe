import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="utility-page">
      <p className="eyebrow">Page not found · 404</p>
      <h1>That page doesn’t exist.</h1>
      <p className="lede"><Link to="/">Return to today’s challenge</Link> and try another connection.</p>
    </section>
  )
}
