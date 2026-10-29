import { useState } from "react";
import { Activity, ArrowRight, BarChart3, BookOpenCheck, CalendarDays, CircleHelp, Clock3, Flame, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import { subjects } from "../data/subjects.js";
import { buildLearningAnalytics } from "../data/learningAnalytics.js";
import { useProgress } from "../state/progressStore.js";

const PRIORITY_LABEL = { urgent: "Overdue", high: "High priority", medium: "Next up", baseline: "Suggested" };
const EVENT_LABELS = [
  ["topicCompletions", "Topics completed", "#8B5CF6"],
  ["mcqAnswers", "MCQs answered", "#22D3EE"],
  ["codingAttempts", "Coding attempts recorded", "#818CF8"],
  ["codingCompletions", "Coding marked complete", "#A78BFA"],
  ["revisions", "Revision reviews", "#2DD4BF"],
  ["simulations", "Simulations submitted", "#60A5FA"],
  ["missions", "Missions completed", "#34D399"],
];

function formatDate(dateKey, options = { month: "short", day: "numeric" }) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

function MetricCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  return <article className={`analytics-metric analytics-metric-${tone}`}>
    <span className="analytics-metric-icon"><Icon size={17} aria-hidden="true" /></span>
    <span className="analytics-metric-label">{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>;
}

function ActivityHeatmap({ days }) {
  const maxEvents = Math.max(1, ...days.map((day) => day.eventCount));
  return <ol className={`analytics-heatmap analytics-heatmap-${days.length}`} aria-label={`${days.length}-day activity calendar`}>
    {days.map((day) => {
      const height = day.eventCount ? Math.max(15, Math.round(day.eventCount / maxEvents * 100)) : 0;
      const statusLabel = day.status === "active" ? "Active" : day.status === "inactive" ? "No activity recorded" : day.status === "pending" ? "Today, still in progress" : "Before tracking began; activity unknown";
      return <li className={`analytics-heat-day ${day.status}`} key={day.date}>
        <div className="analytics-heat-column" aria-hidden="true"><span style={{ height: `${height}%` }} /></div>
        <strong>{formatDate(day.date, { day: "numeric" })}</strong>
        <small>{formatDate(day.date, { weekday: "short" })}</small>
        <span className="analytics-sr-only">{formatDate(day.date, { dateStyle: "full" })}: {statusLabel}; {day.eventCount} events</span>
      </li>;
    })}
  </ol>;
}

function ActivityTrend({ trend }) {
  const maxValue = Math.max(1, ...trend.series.map((day) => day.total));
  const visibleEvents = trend.series.some((day) => day.total > 0);
  if (!visibleEvents) return <div className="analytics-empty"><BarChart3 size={19} aria-hidden="true" /><div><strong>No historical trend is available yet</strong><p>CodePrep previously kept current progress snapshots, not dated change records. Daily activity events will build this timeline from now on; past progress will not be backfilled.</p></div></div>;
  return <>
    <div className="analytics-trend-legend" aria-label="Activity event categories">{EVENT_LABELS.map(([, label, color]) => <span key={label}><i style={{ backgroundColor: color }} />{label}</span>)}</div>
    <div className={`analytics-trend-chart analytics-trend-${trend.period}`} role="img" aria-label={`${trend.period}-day chart of recorded daily CodePrep activity events`}>
      {trend.series.map((day) => <div className={`analytics-trend-day ${day.status}`} key={day.date} title={`${formatDate(day.date, { dateStyle: "medium" })}: ${day.total} recorded events`}>
        <div className="analytics-trend-stack">{EVENT_LABELS.map(([key, , color]) => day[key] > 0 && <span key={key} style={{ height: `${Math.max(2, day[key] / maxValue * 100)}%`, backgroundColor: color }} />)}</div>
        <small>{trend.period === 7 ? formatDate(day.date, { weekday: "short" }) : formatDate(day.date, { day: "numeric" })}</small>
      </div>)}
    </div>
    <p className="analytics-chart-note">Each bar counts timestamped actions. It does not estimate past topic or subject percentages.</p>
  </>;
}

function SubjectBreakdown({ subjectMetrics }) {
  return <div className="analytics-subject-list">{subjectMetrics.map((metric) => <article className="analytics-subject-card" key={metric.subject.id}>
    <div className="analytics-subject-heading"><div><span className="eyebrow">{metric.subject.name}</span><h3>{metric.subject.fullName ?? metric.subject.name}</h3></div>
      <strong>{metric.completionPercent === null ? "—" : `${metric.completionPercent}%`}</strong></div>
    {metric.totalTopics > 0 && <ProgressBar value={metric.completionPercent ?? 0} label={`${metric.subject.name} topic completion`} />}
    <div className="analytics-subject-stats">
      <div><span>Topic coverage</span><strong>{metric.completedTopics}/{metric.totalTopics} complete</strong></div>
      <div><span>Saved MCQ answers</span><strong>{metric.answeredQuestions ? `${metric.accuracy}% · ${metric.answeredQuestions} answers` : "No answer data"}</strong></div>
      <div><span>MCQ answer events (90 days)</span><strong>{metric.mcqSubmissionEvents === null ? "Tracking not started" : metric.mcqSubmissionEvents}</strong></div>
      {metric.totalCodingProblems > 0 && <div><span>Coding marked complete</span><strong>{metric.completedCodingProblems}/{metric.totalCodingProblems}</strong></div>}
    </div>
    <div className="analytics-attention"><strong>Topics needing more evidence</strong>{metric.attentionTopics.length
      ? <ul>{metric.attentionTopics.map(({ topic, accuracy, answered }) => <li key={topic.id}><Link to={`/subjects/${metric.subject.id}/topics/${topic.id}#practice`}>{topic.title}</Link><span>{accuracy}% · {answered} answers</span></li>)}</ul>
      : <p>{metric.answeredQuestions ? "No topic has 3+ saved MCQ answers at 60% accuracy or lower." : "Not enough saved MCQ answers to assess topic performance."}</p>}</div>
  </article>)}</div>;
}

export default function AnalyticsPage() {
  const progressApi = useProgress();
  const [period, setPeriod] = useState(7);
  const analytics = buildLearningAnalytics(subjects, progressApi, { days: period });
  const hasRecordedActivity = analytics.activity.totalEventsInPeriod > 0;
  const hasAnyProgress = analytics.topicCoverage.completed > 0 || analytics.practice.answeredQuestions > 0 || analytics.practice.completedCodingProblems > 0 || analytics.simulations.length > 0;
  return <div className="stack analytics-page">
    <header className="analytics-heading"><div className="analytics-heading-icon"><Activity size={19} aria-hidden="true" /></div><div>
      <span className="eyebrow">Learning Analytics</span><h2>See how your preparation is building.</h2>
      <p>Real learning actions, topic progress, and practice records from this browser. This is an activity summary, not a placement prediction.</p>
    </div></header>

    {!hasAnyProgress && !hasRecordedActivity && <section className="analytics-welcome" aria-labelledby="analytics-welcome-heading"><CircleHelp size={20} aria-hidden="true" /><div>
      <h3 id="analytics-welcome-heading">Your analytics start with your first learning action</h3><p>There is no progress history to summarize yet. Start a subject or answer practice questions; CodePrep will begin recording activity from that point. Earlier history is not available.</p>
      <Link className="primary-button" to="/subjects">Browse subjects<ArrowRight size={15} /></Link>
    </div></section>}

    <section className="analytics-metric-grid" aria-label="Learning overview">
      <MetricCard icon={BookOpenCheck} label="Topics completed" value={`${analytics.topicCoverage.completed}/${analytics.topicCoverage.total}`} detail={`${analytics.topicCoverage.percent ?? 0}% of catalog topics marked complete`} tone="blue" />
      <MetricCard icon={Target} label="Saved MCQ answers" value={analytics.practice.answeredQuestions} detail={analytics.practice.accuracy === null ? "Accuracy unavailable until answers are saved" : `${analytics.practice.correctAnswers} correct · ${analytics.practice.accuracy}% accuracy`} tone="violet" />
      <MetricCard icon={TrendingUp} label="Coding problems" value={`${analytics.practice.completedCodingProblems}/${analytics.practice.totalCodingProblems}`} detail="Marked complete by you; not automatically graded" tone="amber" />
      <MetricCard icon={Clock3} label="Revision due" value={analytics.revision.overdue} detail={`${analytics.revision.dueToday} scheduled today · ${analytics.revision.unscheduled} without a schedule`} tone="green" />
      <MetricCard icon={Flame} label="Current activity streak" value={analytics.activity.streak === null ? "—" : `${analytics.activity.streak} days`} detail={analytics.trackingAvailable ? "Consecutive days with a recorded action; today is still in progress" : "Available after the first tracked learning action"} tone="rose" />
      <MetricCard icon={BarChart3} label="Submitted simulations" value={analytics.simulations.length} detail={analytics.simulations.length ? `Latest score: ${analytics.simulations[0].result.scorePercent}%` : "No submitted score available"} tone="slate" />
    </section>

    <section className="content-section analytics-section" aria-labelledby="analytics-consistency-heading">
      <div className="section-title analytics-section-heading"><div><span className="eyebrow">Study consistency</span><h2 id="analytics-consistency-heading">Your recent activity</h2><p>Inactive days are only counted after tracking started. Earlier days are unknown; today stays in progress until local midnight.</p></div>
        <div className="analytics-period-control" role="group" aria-label="Activity period">{[7, 30].map((days) => <button key={days} type="button" aria-pressed={period === days} className={period === days ? "active" : ""} onClick={() => setPeriod(days)}>{days} days</button>)}</div>
      </div>
      <div className="analytics-activity-summary"><div><strong>{analytics.activity.activeDays}</strong><span>active days</span></div><div><strong>{analytics.activity.inactiveDays}</strong><span>known inactive days</span></div><div><strong>{analytics.activity.unknownDays}</strong><span>days before tracking</span></div><div><strong>{analytics.activity.totalEventsInPeriod}</strong><span>learning actions in {period} days</span></div><div><strong>{analytics.activity.consistencyPercent === null ? "—" : `${analytics.activity.consistencyPercent}%`}</strong><span>consistency on known full days</span></div></div>
      <ActivityHeatmap days={analytics.activity.days} />
      <div className="analytics-heat-legend"><span><i className="active" />Activity recorded</span><span><i className="inactive" />Known no activity</span><span><i className="unknown" />Not tracked</span><span><i className="pending" />Today</span></div>
      {!analytics.trackingAvailable && <p className="analytics-data-note">Activity history begins with your first action after this update. The current progress snapshot remains available, but prior active and inactive days cannot be determined.</p>}
    </section>

    <section className="content-section analytics-section" aria-labelledby="analytics-trend-heading">
      <div className="section-title"><div><span className="eyebrow">Prospective activity record</span><h2 id="analytics-trend-heading">Progress over time</h2><p>Shows dated learning actions recorded after activity tracking began.</p></div></div>
      <ActivityTrend trend={analytics.trend} />
    </section>

    <section className="content-section analytics-section" aria-labelledby="analytics-subject-heading">
      <div className="section-title"><div><span className="eyebrow">Subject performance</span><h2 id="analytics-subject-heading">Progress by subject</h2><p>Topic completion is comparable across subjects. MCQ accuracy and coding completion are shown separately only where those records exist.</p></div></div>
      {analytics.subjectMetrics.length ? <SubjectBreakdown subjectMetrics={analytics.subjectMetrics} /> : <p className="analytics-data-note">No subjects are available in the catalog.</p>}
    </section>

    <div className="analytics-bottom-grid">
      <section className="content-section analytics-section" aria-labelledby="analytics-simulation-heading"><div className="section-title"><div><span className="eyebrow">Assessment record</span><h2 id="analytics-simulation-heading">Recent simulation scores</h2></div><Link className="analytics-text-link" to="/simulation">Open simulations<ArrowRight size={14} /></Link></div>
        {analytics.simulations.length ? <ul className="analytics-simulation-list">{analytics.simulations.slice(0, 3).map((attempt) => <li key={attempt.id}><div><strong>{attempt.config?.focusLabel ?? "Placement simulation"}</strong><small>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(attempt.submittedAt))} · {attempt.result.correct}/{attempt.result.total} correct</small></div><b>{attempt.result.scorePercent}%</b></li>)}</ul> : <p className="analytics-data-note">Scores appear after a simulation is submitted. An active draft is not counted.</p>}
      </section>
      <section className="content-section analytics-section" aria-labelledby="analytics-next-heading"><div className="section-title"><div><span className="eyebrow">Evidence-based suggestions</span><h2 id="analytics-next-heading">Recommended next actions</h2><p>Shared with the Readiness Coach to keep guidance consistent.</p></div><Link className="analytics-text-link" to="/readiness">Readiness Coach<ArrowRight size={14} /></Link></div>
        {analytics.recommendations.length ? <ol className="analytics-recommendation-list">{analytics.recommendations.map((item) => <li key={item.id}><span className={`analytics-priority ${item.priority}`}>{PRIORITY_LABEL[item.priority]}</span><div><strong>{item.title}</strong><small>{item.reason}</small></div><Link to={item.href} aria-label={`Open ${item.title}`}>Open<ArrowRight size={13} /></Link></li>)}</ol> : <p className="analytics-data-note">No actions can be derived from the current catalog.</p>}
      </section>
    </div>

    <p className="analytics-footnote"><CalendarDays size={15} aria-hidden="true" />Activity begins prospectively and retains at most 500 valid events from approximately the last 90 days. Saved-answer accuracy and current completion can still be shown from existing progress records even when historical event tracking has not started.</p>
  </div>;
}
