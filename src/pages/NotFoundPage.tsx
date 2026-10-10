import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="utility-page">
      <p className="eyebrow">Flight not found · 404</p>
      <h1>That route isn’t on the board.</h1>
      <p className="lede"><Link to="/">Return to today’s challenge</Link> and try another connection.</p>
    </section>
  )
}
