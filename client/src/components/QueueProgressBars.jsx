import "./QueueProgressBars.css";

/**
 * Shared "Occupied Slots / Serviced People" dual progress bar, used across the dashboard,
 * queue, queue-status, and queue-tracking pages. The occupancy fill is intentionally blue
 * everywhere for visual consistency.
 */
export default function QueueProgressBars({
  occupancyCurrent = 0,
  occupancyTotal = 0,
  occupancyPercent = 0,
  servicedCurrent = 0,
  servicedTotal = 0,
  servicedPercent = 0,
}) {
  return (
    <div className="qs-progress-card">
      <div className="queue-progress-group">
        <div className="queue-progress-wrapper">
          <div className="qs-progress-label-row">
            <p className="qs-progress-label">Occupied Slots</p>
            <p className="qs-progress-value">
              {occupancyCurrent}/{occupancyTotal}
              <span className="qs-progress-percent">&nbsp;({occupancyPercent}%)</span>
            </p>
          </div>
          <div className="qs-progress-bar">
            <div className="qs-progress-fill" style={{ width: `${occupancyPercent}%` }} />
          </div>
        </div>
        <div className="queue-progress-wrapper">
          <div className="qs-progress-label-row">
            <p className="qs-progress-label">Serviced People</p>
            <p className="qs-progress-value">
              {servicedCurrent}/{servicedTotal}
              <span className="qs-progress-percent">&nbsp;({servicedPercent}%)</span>
            </p>
          </div>
          <div className="qs-progress-bar">
            <div className="qs-progress-fill qs-progress-fill-serviced" style={{ width: `${servicedPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
