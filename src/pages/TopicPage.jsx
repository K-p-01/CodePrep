import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import TopicContent from "../components/TopicContent.jsx";
import { useContent } from "../state/contentStore.jsx";
import { useProgress } from "../state/progressStore.js";

export default function TopicPage() {
  const { subjectId, topicId } = useParams();
  const { subjects, loading } = useContent();
  const subject = subjects.find((item) => item.id === subjectId);
  const topic = subject?.topics?.find((item) => item.id === topicId);
  const progressApi = useProgress();

  if (loading) return <div className="loading-panel">Loading topic…</div>;
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

