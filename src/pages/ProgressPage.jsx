import { Link } from "react-router-dom";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function ProgressPage() {
  const progressApi = useProgress();
  const { summary } = progressApi;

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Your learning activity</span>
          <h2>Progress</h2>
          <p>Topic and practice progress is saved in this browser for the MVP.</p>
        </div>
        <ProgressBar value={summary.percent} label="Overall progress" />
      </section>
      <section className="stats-grid">
        <div className="stat-card"><strong>{summary.completedTopics}</strong><span>Topics completed</span></div>
        <div className="stat-card"><strong>{summary.totalTopics}</strong><span>Topics in populated roadmaps</span></div>
        <div className="stat-card"><strong>{summary.practiceCompleted}</strong><span>Practice items completed</span></div>
      </section>
      {subjects.filter((subject) => subject.topics.length > 0).map((subject) => (
        <section className="content-section" key={subject.id}>
          <div className="section-title">
            <div><span className="eyebrow">{subject.name}</span><h2>{subject.fullName}</h2></div>
            <ProgressBar value={progressApi.getSubjectProgress(subject).percent} label="Subject progress" />
          </div>
          <div className="roadmap-list">
            {subject.topics.map((topic) => {
              const progress = progressApi.getTopicProgress(subject.id, topic);
              const status = progressApi.getTopicStatus(subject, topic);
              return (
                <Link className="roadmap-item" key={topic.id} to={`/subjects/${subject.id}/topics/${topic.id}`}>
                  <div className="roadmap-copy">
                    <div className="roadmap-title-row"><h3>{topic.order}. {topic.title}</h3><span className={`status-badge ${status.id}`}>{status.label}</span></div>
                    <ProgressBar value={progress.percent} label={`${topic.title} progress`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
