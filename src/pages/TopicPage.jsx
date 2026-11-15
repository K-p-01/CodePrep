import { useEffect } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import NotFoundState from "../components/layout/NotFoundState.jsx";
import SaveButton from "../components/SaveButton.jsx";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import TopicContent from "../components/topic/TopicContent.jsx";
import { getSubject, getTopic } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function TopicPage() {
  const { subjectId, topicId } = useParams();
  const subject = getSubject(subjectId);
  const topic = getTopic(subjectId, topicId);
  const progressApi = useProgress();
  const { isTopicComplete, toggleTopic } = progressApi;

  useEffect(() => {
    if (window.location.hash === "#algorithm-lab") {
      requestAnimationFrame(() => document.getElementById("algorithm-lab")?.scrollIntoView({ block: "start" }));
    }
  }, [subjectId, topicId]);

  if (!subject || !topic) {
    return (
      <NotFoundState
        title={subject ? "Topic not found" : "Subject not found"}
        message={subject
          ? `There is no topic with the ID “${topicId}” in the ${subject.name} roadmap.`
          : `There is no subject with the ID “${subjectId}”. Choose a subject from the catalog to continue.`}
        backTo={subject ? `/subjects/${subject.id}` : "/subjects"}
        backLabel={subject ? `Back to ${subject.name} roadmap` : "Browse subjects"}
      />
    );
  }

  const complete = isTopicComplete(subject.id, topic.id);
  const topicProgress = progressApi.getTopicProgress(subject.id, topic);
  const topicStatus = progressApi.getTopicStatus(subject, topic);
  const orderedTopics = [...subject.topics].sort((left, right) => left.order - right.order);
  const topicIndex = orderedTopics.findIndex((item) => item.id === topic.id);
  const previousTopic = topicIndex > 0 ? orderedTopics[topicIndex - 1] : null;
  const nextTopic = topicIndex >= 0 ? orderedTopics[topicIndex + 1] ?? null : null;
  const module = subject.modules?.find((item) => item.id === topic.moduleId);

  return (
    <div className="stack">
      <nav className="topic-breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Dashboard</Link>
            <ChevronRight size={15} aria-hidden="true" />
          </li>
          <li>
            <Link to={`/subjects/${subject.id}`}>{subject.name}</Link>
            <ChevronRight size={15} aria-hidden="true" />
          </li>
          <li aria-current="page">{topic.title}</li>
        </ol>
      </nav>

      <section id="overview" className="topic-hero topic-overview" style={{ "--accent": subject.accent }}>
        <div>
          <span className="eyebrow">
            {subject.name}{module ? ` · ${module.title}` : ""} · Topic {topic.order}
          </span>
          <h2>{topic.title}</h2>
          <p>{topic.summary}</p>
        </div>
        <div className="topic-meta-card">
          <span className={`status-badge ${topicStatus.id}`}>{topicStatus.label}</span>
          <span>{topic.level}</span>
          {topic.duration && <strong>{topic.duration}</strong>}
          <ProgressBar value={topicProgress.practicePercent} label={`Practice completed · ${topicProgress.practiceCompleted} of ${topicProgress.practiceTotal}`} />
          <SaveButton saved={progressApi.isSaved("topic", subject.id, topic.id)} onToggle={() => progressApi.toggleSaved("topic", subject.id, topic.id)} itemLabel={`${topic.title} topic`} />
          <a className="primary-button" href="#learn">
            Start learning
          </a>
        </div>
      </section>

      <nav className="topic-section-nav" aria-label="Topic learning sections">
        <a href="#overview">Overview</a>
        <a href="#learn">Learn</a>
        {subject.id === "dsa" && ["dynamic-programming", "graphs", "recursion"].includes(topic.id) && <a href="#algorithm-lab">Algorithm visualizer</a>}
        <a href="#notes">Notes</a>
        <a href="#practice">Practice</a>
      </nav>

      <TopicContent
        subject={subject}
        topic={topic}
        complete={complete}
        onToggleComplete={() => toggleTopic(subject.id, topic.id)}
        progressApi={progressApi}
      />

      <nav className="topic-sequence-navigation" aria-label="Roadmap topic navigation">
        {previousTopic ? (
          <Link className="secondary-button" to={`/subjects/${subject.id}/topics/${previousTopic.id}`}>
            <ArrowLeft size={17} />
            <span><small>Previous topic</small><strong>{previousTopic.title}</strong></span>
          </Link>
        ) : (
          <span className="topic-sequence-edge">First topic</span>
        )}
        <Link className="back-link" to={`/subjects/${subject.id}`}>
          Back to roadmap
        </Link>
        {nextTopic ? (
          <Link className="secondary-button next-topic-link" to={`/subjects/${subject.id}/topics/${nextTopic.id}`}>
            <span><small>Next topic</small><strong>{nextTopic.title}</strong></span>
            <ArrowRight size={17} />
          </Link>
        ) : (
          <span className="topic-sequence-edge">End of roadmap</span>
        )}
      </nav>
    </div>
  );
}
