export default function ProgressBar({ value, label }) {
  return (
    <div className="progress-block">
      <div className="progress-meta">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, value))}>
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
