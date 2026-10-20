import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import TopicContent from "../components/topic/TopicContent.jsx";
import { getSubject, getTopic } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function TopicPage() {
  const { subjectId, topicId } = useParams();
  const subject = getSubject(subjectId);
  const topic = getTopic(subjectId, topicId);
  const progressApi = useProgress();
  const { isTopicComplete, toggleTopic } = progressApi;

  if (!subject || !topic) {
    return <Navigate to="/" replace />;
  }

  const complete = isTopicComplete(subject.id, topic.id);

  return (
    <div className="stack">
      <Link to={`/subjects/${subject.id}`} className="back-link">
        <ArrowLeft size={17} />
        Back to {subject.name} roadmap
      </Link>

      <section className="topic-hero" style={{ "--accent": subject.accent }}>
        <div>
          <span className="eyebrow">
            {subject.name} · Topic {topic.order}
          </span>
          <h2>{topic.title}</h2>
          <p>{topic.summary}</p>
        </div>
        <div className="topic-meta-card">
          <span>{topic.level}</span>
          <strong>{topic.duration}</strong>
        </div>
      </section>

      <TopicContent
        subject={subject}
        topic={topic}
        complete={complete}
        onToggleComplete={() => toggleTopic(subject.id, topic.id)}
        progressApi={progressApi}
      />
    </div>
  );
}
