import ProgressBar from "./ProgressBar.jsx";

export default function PracticeProgress({ type, summary }) {
  const total = type === "coding" ? summary.totalProblems : summary.totalQuestions;
  const completed = type === "coding" ? summary.completedProblems : summary.answeredQuestions;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const label = type === "coding" ? "Coding practice progress" : "MCQ attempt progress";

  return (
    <div className="practice-progress">
      <ProgressBar value={percent} label={label} />
      <div className="practice-progress-stats">
        <span>
          {completed}/{total} {type === "coding" ? "problems completed" : "questions answered"}
        </span>
        {type === "mcq" && (
          <strong>
            Score: {summary.score}/{summary.totalQuestions}
          </strong>
        )}
      </div>
    </div>
  );
}

