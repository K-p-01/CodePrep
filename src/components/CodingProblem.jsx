import { CheckCircle2, ExternalLink } from "lucide-react";
import BookmarkButton from "./BookmarkButton.jsx";

export default function CodingProblem({ problem, completed, onToggle, bookmarked, onBookmark }) {
  return (
    <article className="coding-problem-card">
      <div>
        <div className="problem-title-row">
          <h3>{problem.title}</h3>
          <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
        </div>
        <p>
          {problem.topic} · {problem.platform}
        </p>
      </div>

      <div className="problem-actions">
        <BookmarkButton label="Save" bookmarked={bookmarked} onToggle={onBookmark} />
        <a href={problem.url} target="_blank" rel="noreferrer" className="secondary-button">
          <ExternalLink size={16} />
          Open
        </a>
        <button type="button" className={completed ? "complete-button done" : "complete-button"} onClick={onToggle}>
          <CheckCircle2 size={17} />
          {completed ? "Completed" : "Mark Completed"}
        </button>
      </div>
    </article>
  );
}

