import { CheckCircle2, ExternalLink } from "lucide-react";
import SaveButton from "../SaveButton.jsx";

function getSafeProblemUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function CodingProblem({ problem, completed, onToggle, saved = false, onToggleSaved }) {
  const url = getSafeProblemUrl(problem.url);

  return (
    <article className="coding-problem-card">
      <div>
        <div className="problem-title-row">
          <h3>{problem.title}</h3>
          {problem.difficulty && (
            <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
          )}
        </div>
        <p>
          {[problem.topic, problem.platform].filter(Boolean).join(" · ") || "Coding problem"}
        </p>
        <span className={`problem-completion ${completed ? "done" : "pending"}`} role="status" aria-live="polite">
          {completed ? "Completed" : "Not completed"}
        </span>
      </div>

      <div className="problem-actions">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="secondary-button" aria-label={`Open ${problem.title} on ${problem.platform || "external site"} in a new tab`}>
            <ExternalLink size={16} />
            Open Problem
          </a>
        ) : (
          <span className="resource-unavailable">Problem link unavailable</span>
        )}
        <button
          type="button"
          className={completed ? "complete-button done" : "complete-button"}
          onClick={onToggle}
          aria-pressed={completed}
          aria-label={`${completed ? "Mark incomplete" : "Mark completed"}: ${problem.title}`}
        >
          <CheckCircle2 size={17} />
          {completed ? "Completed" : "Mark Completed"}
        </button>
        {onToggleSaved && <SaveButton saved={saved} onToggle={onToggleSaved} itemLabel={problem.title} />}
      </div>
    </article>
  );
}
