import { Activity, ArrowRight, BookOpen, CircleAlert, Clock3, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import { subjects } from "../data/subjects.js";
import { buildReadinessReport, MIN_TOPIC_ATTEMPTS } from "../data/readinessCoach.js";
import { useProgress } from "../state/progressStore.js";

const PRIORITY_LABELS = { urgent: "Overdue", high: "High priority", medium: "Next up", baseline: "Baseline" };

function TopicLabel({ subject, topic }) {
  return <Link to={`/subjects/${subject.id}/topics/${topic.id}`}>{subject.name} · {topic.title}</Link>;
}

function PerformanceEvidence({ entries, empty, kind }) {
  if (!entries.length) return <p className="readiness-empty-copy">{empty}</p>;
  return <ul className="readiness-evidence-list">{entries.map((item) => <li key={`${item.subject.id}:${item.topic.id}`}>
    <div><strong><TopicLabel subject={item.subject} topic={item.topic} /></strong><small>{item.accuracy}% across {item.answered} recorded MCQ answers</small></div>
    <span className={`readiness-evidence-value ${kind}`}>{item.accuracy}%</span>
  </li>)}</ul>;
}

function TopicProgress({ report }) {
  const groups = subjects.map((subject) => ({
    subject,
    topics: report.topicMetrics.filter((metric) => metric.subject.id === subject.id),
  })).filter((group) => group.topics.length);
  return <section className="content-section readiness-section" aria-labelledby="readiness-topics-heading">
    <div className="section-title"><div><span className="eyebrow">Roadmap detail</span><h2 id="readiness-topics-heading">Topic progress and accuracy</h2><p>Coverage is marked only when you complete a topic. Accuracy uses valid saved MCQ answers from practice and submitted simulations.</p></div></div>
    <div className="readiness-topic-groups">{groups.map(({ subject, topics }) => {
      const completed = topics.filter((topic) => topic.completed).length;
      const answers = topics.reduce((sum, topic) => sum + topic.answered, 0);
      return <details className="readiness-topic-group" key={subject.id} open={topics.some((topic) => topic.completed || topic.answered > 0 || topic.completedProblems > 0)}>
        <summary><span><strong>{subject.name}</strong><small>{completed}/{topics.length} topics complete · {answers} recorded MCQ answers</small></span><ArrowRight size={16} aria-hidden="true" /></summary>
        <div className="readiness-topic-list">{topics.map((item) => <article className="readiness-topic-row" key={`${subject.id}:${item.topic.id}`}>
          <div className="readiness-topic-name"><Link to={`/subjects/${subject.id}/topics/${item.topic.id}`}>{item.topic.title}</Link><span className={`status-badge ${item.status}`}>{item.status === "inProgress" ? "In progress" : item.status === "completed" ? "Completed" : "Not started"}</span></div>
          <div className="readiness-topic-facts">
            <span>Practice coverage: {item.practicePercent === null ? "No practice items" : `${item.practicePercent}%`}</span>
            <span>MCQ accuracy: {item.accuracy === null ? "No recorded answers" : `${item.accuracy}% (${item.answered})`}</span>
            {item.totalProblems > 0 && <span>Coding problems: {item.completedProblems}/{item.totalProblems} marked complete</span>}
          </div>
        </article>)}</div>
      </details>;
    })}</div>
  </section>;
}

export default function ReadinessPage() {
  const progressApi = useProgress();
  const report = buildReadinessReport(subjects, progressApi);
  const hasActivity = report.topicCoverage.completed > 0 || report.practice.answeredMcqs > 0 ||
    report.practice.completedCodingProblems > 0 || report.simulations.length > 0 || report.revision.total > 0;
  const mission = report.mission;

  return <div className="stack readiness-page">
    <header className="readiness-heading">
      <div><span className="eyebrow">Placement readiness</span><h2>Your preparation, at a glance</h2>
        <p>A clear view of roadmap coverage, submitted practice, revision schedules, and completed simulations. It reflects recorded activity, not a prediction of placement outcomes.</p></div>
    </header>

    {!hasActivity && <section className="readiness-welcome" aria-labelledby="readiness-welcome-heading">
      <div><h3 id="readiness-welcome-heading">Your readiness picture is just getting started</h3>
        <p>No completed topics, practice answers, coding completions, or submitted simulations yet. Start a roadmap or take a diagnostic to establish your baseline.</p>
        <div className="readiness-welcome-actions"><Link className="primary-button" to="/subjects">Browse subjects<ArrowRight size={15} /></Link><Link className="secondary-button" to="/simulation">Take a diagnostic<ArrowRight size={15} /></Link></div></div>
    </section>}

    <section className="readiness-overview" aria-label="Preparation summary">
      <div className="readiness-overview-copy"><span className="eyebrow">Recorded preparation</span>
        <h3>{report.topicCoverage.percent === null ? "No roadmap coverage available" : `${report.topicCoverage.percent}% topic coverage`}</h3>
        <p>{report.topicCoverage.completed} of {report.topicCoverage.total} catalog topics marked complete. Topic coverage is separate from practice performance.</p>
        {report.topicCoverage.total > 0 && <ProgressBar value={report.topicCoverage.percent ?? 0} label="Topic coverage" />}
      </div>
      <div className="readiness-overview-stats">
        <div><span>MCQ answers recorded</span><strong>{report.practice.answeredMcqs}</strong></div>
        <div><span>MCQ accuracy</span><strong>{report.practice.accuracy === null ? "Not available" : `${report.practice.accuracy}%`}</strong></div>
        <div><span>Coding problems marked complete</span><strong>{report.practice.completedCodingProblems}/{report.practice.totalCodingProblems}</strong></div>
      </div>
    </section>

    <div className="readiness-column-grid">
      <section className="content-section readiness-section" aria-labelledby="readiness-strengths-heading">
        <div className="section-title"><div><span className="eyebrow">Evidence based</span><h2 id="readiness-strengths-heading"><TrendingUp size={18} /> Demonstrated strengths</h2></div></div>
        <PerformanceEvidence entries={report.strengths} kind="strength" empty={`A topic appears here after at least ${MIN_TOPIC_ATTEMPTS} recorded MCQ answers with 80% or better accuracy. Topic completion alone is not treated as skill evidence.`} />
      </section>
      <section className="content-section readiness-section" aria-labelledby="readiness-improve-heading">
        <div className="section-title"><div><span className="eyebrow">Practice signals</span><h2 id="readiness-improve-heading"><CircleAlert size={18} /> Priority improvement areas</h2></div></div>
        {report.repeatedErrors.length > 0 && <div className="readiness-repeat-signal"><strong>Repeated simulation errors</strong><p>{report.repeatedErrors.length} question{report.repeatedErrors.length === 1 ? " was" : "s were"} missed across multiple submitted simulations. Review recommendations below link to the relevant topic.</p></div>}
        <PerformanceEvidence entries={report.improvementAreas} kind="improvement" empty={`No topic meets the minimum of ${MIN_TOPIC_ATTEMPTS} recorded MCQ answers at 60% or lower. No topic weakness is inferred from bookmarks, opened questions, or completion status.`} />
      </section>
    </div>

    <section className="content-section readiness-section" aria-labelledby="readiness-recommendations-heading">
      <div className="section-title"><div><span className="eyebrow">Next best actions</span><h2 id="readiness-recommendations-heading">Recommended next steps</h2><p>Priorities follow due schedules, repeated submitted errors, supported accuracy signals, and roadmap order.</p></div></div>
      {report.recommendations.length ? <ol className="readiness-recommendation-list">{report.recommendations.map((recommendation) => <li key={recommendation.id}>
        <span className={`readiness-priority ${recommendation.priority}`}>{PRIORITY_LABELS[recommendation.priority]}</span>
        <div><h3>{recommendation.title}</h3><p>{recommendation.reason}</p></div>
        <Link to={recommendation.href} aria-label={`${recommendation.title}: open recommendation`}>Open<ArrowRight size={15} /></Link>
      </li>)}</ol> : <p className="readiness-empty-copy">No recommendations can be generated from the current catalog.</p>}
    </section>

    <div className="readiness-column-grid">
      <section className="content-section readiness-section" aria-labelledby="readiness-revision-heading">
        <div className="section-title"><div><span className="eyebrow">Smart Revision Queue</span><h2 id="readiness-revision-heading"><Clock3 size={18} /> Revision workload</h2></div><Link className="readiness-inline-link" to="/revision">Open queue<ArrowRight size={14} /></Link></div>
        <div className="readiness-mini-stats"><div><strong>{report.revision.overdue}</strong><span>Scheduled overdue</span></div><div><strong>{report.revision.dueToday}</strong><span>Scheduled today</span></div><div><strong>{report.revision.unscheduled}</strong><span>Without a schedule</span></div></div>
        <p className="readiness-footnote">Only available queue items are counted. Unscheduled saved or in-progress material is listed separately from scheduled reviews.</p>
      </section>
      <section className="content-section readiness-section" aria-labelledby="readiness-mission-heading">
        <div className="section-title"><div><span className="eyebrow">Daily Mission</span><h2 id="readiness-mission-heading"><Target size={18} /> Today's plan</h2></div><Link className="readiness-inline-link" to="/">Dashboard<ArrowRight size={14} /></Link></div>
        {mission ? <><div className="readiness-mission-summary"><strong>{mission.completed}/{mission.total} tasks complete</strong>{mission.duration !== null && <span>{mission.duration} minutes planned</span>}</div>{mission.total > 0 && <ProgressBar value={Math.round(mission.completed / mission.total * 100)} label="Today's mission completion" />}{mission.total === 0 && <p className="readiness-footnote">No available tasks remain in today's saved mission.</p>}</> : <p className="readiness-empty-copy">No mission is saved for today. Generate one from the Dashboard when you are ready.</p>}
      </section>
    </div>

    <section className="content-section readiness-section" aria-labelledby="readiness-simulation-heading">
      <div className="section-title"><div><span className="eyebrow">Submitted assessments only</span><h2 id="readiness-simulation-heading"><Activity size={18} /> Recent placement simulations</h2><p>Scores use submitted simulation results. An active or unfinished assessment is not shown as a result.</p></div><Link className="readiness-inline-link" to="/simulation">Placement Simulation<ArrowRight size={14} /></Link></div>
      {report.simulations.length ? <div className="readiness-simulation-list">{report.simulations.map((attempt) => <article key={attempt.id}>
        <div><strong>{attempt.config?.focusLabel ?? "Placement simulation"}</strong><small>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(attempt.submittedAt))}</small></div>
        <span className="readiness-simulation-score">{attempt.result.scorePercent}%</span>
        <small>{attempt.result.correct}/{attempt.result.total} correct · {attempt.result.answered} answered</small>
      </article>)}</div> : <p className="readiness-empty-copy">No valid submitted simulation attempts are available yet.</p>}
    </section>

    <TopicProgress report={report} />

    <p className="readiness-data-note"><BookOpen size={15} aria-hidden="true" />Coding completion is self-reported; it is not code execution or grading. MCQ history reflects answers retained by this browser, so reset or unavailable history is not reconstructed.</p>
  </div>;
}
