import { CheckCircle2, Circle, Clock3, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar.jsx";

function progressDetailText(progress) {
  if (progress.totalProblems) {
    return `${progress.completedProblems}/${progress.totalProblems} problems completed`;
  }

  if (progress.totalQuestions) {
    return `${progress.answeredQuestions}/${progress.totalQuestions} questions answered`;
  }

  return progress.complete ? "Topic marked complete" : "No practice progress yet";
}

export default function RoadmapList({ subject, progressApi }) {
  return (
    <div className="roadmap-list">
      {subject.topics.map((topic) => {
        const progress = progressApi.getTopicProgress(subject.id, topic);
        const status = progressApi.getTopicStatus(subject, topic);
        const locked = status.id === "locked";

        return (
          <Link
            key={topic.id}
            to={`/subjects/${subject.id}/topics/${topic.id}`}
            className={`roadmap-item ${locked ? "locked" : ""}`}
          >
            <div className="roadmap-status">
              {status.id === "completed" ? <CheckCircle2 size={22} /> : locked ? <Lock size={22} /> : <Circle size={22} />}
            </div>
            <div className="roadmap-copy">
              <div className="roadmap-title-row">
                <h3>
                  {topic.order}. {topic.title}
                </h3>
                <span className={`status-badge ${status.id}`}>{status.label}</span>
              </div>
              <p>{topic.summary}</p>
              <div className="roadmap-meta-row">
                <span>{topic.level}</span>
                <span>
                  <Clock3 size={14} />
                  {topic.duration}
                </span>
              </div>
              <ProgressBar value={progress.percent} label={`${topic.title} progress`} />
              <div className="roadmap-progress-note">{progressDetailText(progress)}</div>
            </div>
          </Link>
        );
      })}

      {!subject.topics.length && (
        <div className="empty-state">
          <Lock size={28} />
          <h3>Roadmap coming soon</h3>
          <p>This subject is part of the data model and can be filled without creating new pages.</p>
        </div>
      )}
    </div>
  );
}

