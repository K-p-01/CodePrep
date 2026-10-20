import ProgressBar from "../dashboard/ProgressBar.jsx";

export default function PracticeProgress({ type, summary }) {
  const total = summary.totalProblems + summary.totalQuestions;
  const completed = summary.completedProblems + summary.answeredQuestions;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const label = type === "mixed" ? "Practice progress" : type === "coding" ? "Coding practice progress" : "MCQ attempt progress";

  return (
    <div className="practice-progress">
      <ProgressBar value={percent} label={label} />
      <div className="practice-progress-stats">
        <span>
          {completed}/{total} items completed
        </span>
        {summary.totalQuestions > 0 && (
          <strong>
            Score: {summary.score}/{summary.totalQuestions}
          </strong>
        )}
      </div>
    </div>
  );
}
