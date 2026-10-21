import { CheckCircle2, Circle, Clock3, ChevronDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function topicStatus(subject, topic, progressApi) {
  return progressApi.getTopicStatus(subject, topic);
}

export default function RoadmapList({ subject, progressApi }) {
  const topics = Array.isArray(subject.topics) ? subject.topics.filter((topic) => topic && typeof topic.id === "string") : [];
  const orderedTopics = [...topics].sort((a, b) => a.order - b.order);
  const activeTopic = orderedTopics.find((topic) => topicStatus(subject, topic, progressApi).id === "inProgress")
    ?? orderedTopics.find((topic) => topicStatus(subject, topic, progressApi).id !== "completed");
  const modules = Array.isArray(subject.modules) && subject.modules.length
    ? subject.modules.map((module) => ({ ...module, topics: orderedTopics.filter((topic) => topic.moduleId === module.id) })).filter((module) => module.topics.length)
    : [{ id: "roadmap", title: "Roadmap topics", description: "Follow the topics in order.", topics: orderedTopics }];

  return (
    <div className="roadmap-modules">
      {modules.map((module, index) => {
        const moduleProgress = module.topics.map((topic) => progressApi.getTopicProgress(subject.id, topic));
        const completed = moduleProgress.filter((item) => item.complete).length;
        const isCurrent = module.topics.some((topic) => topic.id === activeTopic?.id);
        return (
          <details key={module.id} className={`roadmap-module ${isCurrent ? "current" : ""}`} open={isCurrent || index === 0}>
            <summary className="roadmap-module-summary">
              <span className="module-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="module-heading"><strong>{module.title}</strong><small>{module.description}</small></span>
              <span className="module-progress-count">{completed} / {module.topics.length} complete</span>
              <ChevronDown size={18} className="module-chevron" aria-hidden="true" />
            </summary>
            <div className="roadmap-module-topics">
              {module.topics.map((topic) => {
                const progress = progressApi.getTopicProgress(subject.id, topic);
                const status = topicStatus(subject, topic, progressApi);
                const practice = progressApi.getPracticeSummary(subject.id, topic.id, topic.practice);
                const isNext = topic.id === activeTopic?.id;
                return (
                  <Link key={topic.id} to={`/subjects/${subject.id}/topics/${topic.id}`} className={`roadmap-item ${isNext ? "next" : ""}`}>
                    <span className={`roadmap-status ${status.id}`} aria-hidden="true">
                      {status.id === "completed" ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                    </span>
                    <span className="roadmap-copy">
                      <span className="roadmap-title-row">
                        <strong>{topic.order}. {topic.title}</strong>
                        <span className={`status-badge ${status.id}`}>{isNext ? "Up next" : status.label}</span>
                      </span>
                      <span className="roadmap-description">{topic.summary}</span>
                      <span className="roadmap-meta-row">
                        {topic.level && <span>{topic.level}</span>}
                        {topic.duration && <span><Clock3 size={13} />{topic.duration}</span>}
                        {practice.totalProblems > 0 && <span>{practice.completedProblems} / {practice.totalProblems} problems solved</span>}
                        {practice.totalQuestions > 0 && <span>{practice.answeredQuestions} / {practice.totalQuestions} questions answered</span>}
                      </span>
                      {progress.complete && <span className="roadmap-completed-note">Topic marked complete</span>}
                    </span>
                    <span className="roadmap-open-action">{isNext ? "Continue" : "Open"}<ArrowRight size={16} /></span>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
      {!topics.length && <div className="empty-state"><h3>No roadmap topics yet</h3><p>Topics will appear here when they are added to this subject’s roadmap data.</p></div>}
    </div>
  );
}
