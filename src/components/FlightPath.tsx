const checkpoints = ['Your pick', 'Collabs', 'Results']

export function FlightPath({ stage = 0 }: { stage?: 0 | 1 | 2 }) {
  return (
    <div className={`flight-path stage-${stage}`} aria-label={`Challenge progress: ${checkpoints[stage]}`}>
      <span className="flight-line" aria-hidden="true" />
      <span className="plane" aria-hidden="true">➤</span>
      <ol>
        {checkpoints.map((label, index) => (
          <li className={index <= stage ? 'active' : ''} key={label}>
            <span aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
}
