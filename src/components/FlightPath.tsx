const checkpoints = ['Take-off', 'Connection', 'Final call']

export function FlightPath() {
  return (
    <div className="flight-path" aria-label="Challenge progress: ready for take-off">
      <span className="flight-line" aria-hidden="true" />
      <span className="plane" aria-hidden="true">➤</span>
      <ol>
        {checkpoints.map((label, index) => (
          <li className={index === 0 ? 'active' : ''} key={label}>
            <span aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
