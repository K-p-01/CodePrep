import { ArrowRight, CircleCheck, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function ProgressPage() {
  const progressApi = useProgress();
  const summary = progressApi.getStudySummary();
  const continueLearning = progressApi.getContinueLearning();
  const validSubjects = subjects.map((subject) => ({ subject, progress: progressApi.getSubjectProgress(subject) })).filter(({ progress }) => progress.totalTopics > 0);
  const topicsByStatus = (wantedStatus) => validSubjects.flatMap(({ subject }) => subject.topics
    .filter((topic) => topic?.id && progressApi.getTopicStatus(subject, topic).id === wantedStatus)
    .map((topic) => ({ subject, topic })));
  const completedTopics = topicsByStatus("completed");
  const inProgressTopics = topicsByStatus("inProgress");

  return <div className="stack">
    <section className="hero-panel progress-hero">
      <div><span className="eyebrow">Your learning activity</span><h2>Progress</h2><p>Topic completion and practice activity are tracked separately using your saved progress.</p></div>
      <ProgressBar value={summary.overallPercent} label="Completed topics" />
    </section>

    {continueLearning?.complete ? <section className="continue-panel"><div className="continue-icon"><CircleCheck size={24} /></div><div><span className="eyebrow">Roadmap complete</span><h2>Every topic is complete</h2><p>{continueLearning.reason}</p></div><Link className="secondary-button" to="/revision">Review saved items <ArrowRight size={17} /></Link></section> : continueLearning && <section className="continue-panel"><div className="continue-icon"><PlayCircle size={24} /></div><div><span className="eyebrow">Continue Learning</span><h2>{continueLearning.topic.title}</h2><p>{continueLearning.reason} in {continueLearning.subject.name}{continueLearning.topic.duration ? ` · ${continueLearning.topic.duration}` : ""}</p></div><Link className="primary-button" to={`/subjects/${continueLearning.subject.id}/topics/${continueLearning.topic.id}`}>Continue <ArrowRight size={17} /></Link></section>}

    {summary.completedTopics === 0 && summary.practiceCompleted === 0 && <div className="empty-state"><h3>No progress recorded yet</h3><p>Complete a topic or try its practice to see your activity here. Your progress is stored in this browser.</p><Link className="primary-button" to="/subjects">Browse subjects</Link></div>}

    <section className="stats-grid progress-stats-grid">
      <div className="stat-card"><strong>{summary.completedTopics}/{summary.totalTopics}</strong><span>Topics completed</span></div>
      <div className="stat-card"><strong>{summary.completedCodingProblems}/{summary.totalCodingProblems}</strong><span>Coding problems completed</span></div>
      <div className="stat-card"><strong>{summary.answeredQuestions}</strong><span>MCQs answered</span></div>
      <div className="stat-card"><strong>{summary.correctAnswers}</strong><span>Correct answers</span></div>
      <div className="stat-card"><strong>{summary.mcqAccuracy === null ? "—" : `${summary.mcqAccuracy}%`}</strong><span>MCQ accuracy{summary.mcqAccuracy === null ? " · no answers yet" : " · correct / answered"}</span></div>
    </section>

    <section className="content-section"><div className="section-title"><div><span className="eyebrow">Subject roadmaps</span><h2>Progress by subject</h2><p>Subject percentages use completed topics divided by available topics. Practice activity does not mark a topic complete.</p></div></div>
      <div className="progress-subject-list">{validSubjects.map(({ subject, progress }) => <article className="progress-subject" key={subject.id}>
        <div className="section-title"><div><span className="eyebrow">{subject.name}</span><h3>{subject.fullName}</h3><p>{progress.completedTopics} of {progress.totalTopics} topics completed · {progress.startedTopics} in progress</p></div><ProgressBar value={progress.percent} label={`${subject.name} topic completion`} /></div>
        <div className="progress-topic-list">{[...subject.topics].filter((topic) => topic?.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((topic) => {
          const status = progressApi.getTopicStatus(subject, topic);
          const detail = progressApi.getPracticeSummary(subject.id, topic.id, topic.practice);
          return <Link className="progress-topic-row" key={topic.id} to={`/subjects/${subject.id}/topics/${topic.id}`}>
            <span className="progress-topic-name">{topic.title}</span><span className={`status-badge ${status.id}`}>{status.label}</span>
            <small>Practice: {detail.completedProblems}/{detail.totalProblems} coding completed · {detail.answeredQuestions}/{detail.totalQuestions} MCQs answered</small>
          </Link>;
        })}</div>
      </article>)}</div>
    </section>

    <div className="progress-status-columns">
      <section className="content-section"><div className="section-title"><div><span className="eyebrow">{completedTopics.length} topics</span><h2>Completed</h2></div></div>{completedTopics.length ? <ul className="progress-status-list">{completedTopics.map(({ subject, topic }) => <li key={`${subject.id}:${topic.id}`}><Link to={`/subjects/${subject.id}/topics/${topic.id}`}>{subject.name} · {topic.title}</Link></li>)}</ul> : <p className="muted">No topics marked complete yet.</p>}</section>
      <section className="content-section"><div className="section-title"><div><span className="eyebrow">{inProgressTopics.length} topics</span><h2>In progress</h2></div></div>{inProgressTopics.length ? <ul className="progress-status-list">{inProgressTopics.map(({ subject, topic }) => <li key={`${subject.id}:${topic.id}`}><Link to={`/subjects/${subject.id}/topics/${topic.id}`}>{subject.name} · {topic.title}</Link></li>)}</ul> : <p className="muted">Topics with coding or MCQ activity will appear here.</p>}</section>
    </div>
  </div>;
}
