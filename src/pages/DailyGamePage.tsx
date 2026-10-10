import { FlightPath } from '../components/FlightPath'

export function DailyGamePage() {
  return (
    <section className="game-page">
      <div className="sun-disc" aria-hidden="true" />
      <div className="cloud cloud-one" aria-hidden="true" />
      <div className="cloud cloud-two" aria-hidden="true" />
      <div className="game-intro">
        <p className="eyebrow">Today’s challenge · Flight 001</p>
        <h1>Who flies well<br />with <em>Ben Affleck?</em></h1>
        <p className="lede">Name one person they’ve worked with, then recall every shared project you can.</p>
      </div>

      <div className="challenge-card">
        <div className="portrait" aria-hidden="true"><span>BA</span></div>
        <div className="challenge-copy">
          <p className="card-kicker">Your first connection</p>
          <h2>Choose a frequent collaborator</h2>
          <p>Your choice is locked after submission. Pick carefully—the more shared credits, the higher your possible score.</p>
          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="collaborator">Actor, director or screenwriter</label>
            <div className="input-row">
              <input id="collaborator" name="collaborator" placeholder="Start typing a name…" autoComplete="off" />
              <button type="submit" disabled>Board flight</button>
            </div>
            <small>Search will become available when the daily challenge API lands.</small>
          </form>
        </div>
      </div>
      <FlightPath />
    </section>
  )
}
