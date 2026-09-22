export default function ProgressBar({ value, label }) {
  return (
    <div className="progress-block" aria-label={label}>
      <div className="progress-meta">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

