import ProgressBar from "../dashboard/ProgressBar.jsx";

export default function PracticeProgress({ type, summary }) {
  const total = summary.totalProblems + summary.totalQuestions;
  const completed = summary.completedProblems + summary.answeredQuestions;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const label = type === "mixed" ? "Practice progress" : type === "coding" ? "Coding practice progress" : "MCQ attempt progress";

  return <div className="practice-progress">
    <ProgressBar value={percent} label={label} />
    <div className="practice-progress-stats">
      {summary.totalProblems > 0 && <span>Coding problems: {summary.completedProblems}/{summary.totalProblems} completed</span>}
      {summary.totalQuestions > 0 && <span>MCQs: {summary.answeredQuestions}/{summary.totalQuestions} answered · {summary.remainingQuestions} remaining</span>}
    </div>
    {summary.totalQuestions > 0 && <div className="practice-progress-stats">
      <span>Correct: {summary.correctAnswers}/{summary.answeredQuestions} answered</span>
      {summary.accuracy !== null && <strong>Accuracy: {summary.accuracy}%</strong>}
    </div>}
  </div>;
}
