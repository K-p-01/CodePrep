import { ArrowRight, BookOpen, BookmarkCheck, Braces, CheckCircle2, Code2, Compass, Cpu, Database, MessageSquareCode, Network, Sigma, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import DailyMission from "../components/dashboard/DailyMission.jsx";
import { getPlacementPillars } from "../components/dashboard/placementMetrics.js";
import { buildReadinessReport } from "../data/readinessCoach.js";
import { buildRevisionQueue } from "../data/revisionQueue.js";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

const pillarIcons = { dsa: Code2, "core-cs": Database, aptitude: Sigma, "interview-prep": MessageSquareCode };
const subjectIcons = { dsa: Code2, dbms: Database, os: Cpu, cn: Network, oop: Braces, aptitude: Sigma, "interview-prep": MessageSquareCode };

function MetricCard({ icon: Icon, label, value, detail, tone, to }) {
  return <Link className="dashboard-metric" to={to}>
    <span className={`dashboard-metric-icon ${tone}`}><Icon size={17}/></span>
    <span className="dashboard-metric-copy"><small>{label}</small><strong>{value}</strong><span>{detail}</span></span>
  </Link>;
}

function LearningPathCard({ pillar, index }) {
  const Icon = pillarIcons[pillar.id] ?? BookOpen;
  const percent = pillar.totalTopics ? Math.round(pillar.completedTopics / pillar.totalTopics * 100) : 0;
  const to = pillar.href ?? `/subjects/${pillar.availableSubjects[0]?.id ?? "dsa"}`;
  return <Link className={`learning-path-card tone-${index}`} to={to}>
    <span className="learning-path-number">0{index + 1}</span>
    <span className="learning-path-icon"><Icon size={19}/></span>
    <strong>{pillar.title}</strong>
    <small>{pillar.completedTopics} / {pillar.totalTopics} topics · {percent}%</small>
    <span className="learning-path-track"><i style={{ width: `${percent}%` }}/></span>
    <ArrowRight size={16} className="learning-path-arrow"/>
  </Link>;
}

function CourseRow({ subject, progress }) {
  const Icon = subjectIcons[subject.id] ?? BookOpen;
  return <Link className="dashboard-course-row" to={`/subjects/${subject.id}`}>
    <span className="dashboard-course-icon"><Icon size={17}/></span>
    <span className="dashboard-course-copy"><strong>{subject.fullName}</strong><small>{subject.description}</small></span>
    <span className="dashboard-course-progress"><span className="dashboard-course-track"><i style={{ width: `${progress.percent}%` }}/></span><small>{progress.completedTopics}/{progress.totalTopics}</small></span>
    <ArrowRight size={16} className="dashboard-course-arrow"/>
  </Link>;
}

export default function Dashboard() {
  const progressApi = useProgress();
  const readiness = buildReadinessReport(subjects, progressApi);
  const pillars = getPlacementPillars(subjects, progressApi);
  const next = progressApi.getContinueLearning();
  const validNext = next && !next.complete && next.subject?.id && next.topic?.id;
  const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
  const completedTopics = subjects.reduce((sum, subject) => sum + subject.topics.filter((topic) => progressApi.isTopicComplete(subject.id, topic.id)).length, 0);
  const codingProblems = subjects.flatMap((subject) => subject.topics.flatMap((topic) => (topic.practice?.problems ?? []).map((problem) => ({ subject, topic, problem }))));
  const completedProblems = codingProblems.filter(({ subject, topic, problem }) => progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)).length;
  const revisionItems = buildRevisionQueue(subjects, progressApi).filter((item) => item.available);
  const dueReviews = revisionItems.filter((item) => item.schedule && (item.dueStatus === "dueToday" || item.dueStatus === "overdue"));
  const overdueReviews = dueReviews.filter((item) => item.dueStatus === "overdue").length;

  return <div className="dashboard-layout">
    <section className="placement-hero" aria-label="Placement preparation overview">
      <div className="placement-hero-copy"><span className="eyebrow">Your placement preparation</span><h2>{validNext ? "One clear next step." : "Keep your preparation moving."}</h2><p>{validNext ? `${next.topic.title} · ${next.subject.name}. Follow your roadmap, practice, and track progress in one place.` : "Review your roadmap and choose a focused next step."}</p><Link className="placement-hero-button" to={validNext ? `/subjects/${next.subject.id}/topics/${next.topic.id}` : "/subjects"}>{validNext ? "Continue learning" : "Browse roadmaps"}<ArrowRight size={16}/></Link></div>
      <div className="placement-hero-paths">{pillars.slice(0, 3).map((pillar, index) => <LearningPathCard key={pillar.id} pillar={pillar} index={index}/>)}</div>
    </section>

    <section className="dashboard-metrics" aria-label="Learning overview">
      <MetricCard icon={CheckCircle2} label="Topics completed" value={`${completedTopics} / ${totalTopics}`} detail={`${totalTopics - completedTopics} remaining`} tone="violet" to="/progress"/>
      <MetricCard icon={Code2} label="Coding problems" value={`${completedProblems} / ${codingProblems.length}`} detail="Marked complete" tone="blue" to="/practice?type=coding"/>
      <MetricCard icon={Target} label="MCQ accuracy" value={readiness.practice.accuracy === null ? "—" : `${readiness.practice.accuracy}%`} detail={readiness.practice.answeredMcqs ? `${readiness.practice.correctMcqs} of ${readiness.practice.answeredMcqs} correct` : "No answers recorded yet"} tone="green" to="/practice?type=mcq"/>
      <MetricCard icon={BookmarkCheck} label="Pending revisions" value={dueReviews.length} detail={overdueReviews ? `${overdueReviews} overdue` : dueReviews.length ? "Due today" : "Nothing due today"} tone="amber" to="/revision"/>
    </section>

    <div className="dashboard-columns">
      <section className="dashboard-panel dashboard-learning-list" aria-labelledby="my-learning-title">
        <div className="dashboard-section-heading"><div><span className="eyebrow">Your course library</span><h3 id="my-learning-title">My learning</h3></div><Link to="/subjects">Browse all<ArrowRight size={14}/></Link></div>
        <div className="dashboard-course-list">{subjects.map((subject) => <CourseRow key={subject.id} subject={subject} progress={progressApi.getSubjectProgress(subject)}/>)}</div>
      </section>

      <aside className="dashboard-column dashboard-column-focus" aria-label="Today's study focus">
        <DailyMission catalog={subjects} progressApi={progressApi} recommendation={next}/>
        <Link className="dashboard-revision-card" to="/revision"><span className="dashboard-revision-icon"><BookmarkCheck size={18}/></span><span className="dashboard-revision-copy"><strong>Smart revision</strong><small>{dueReviews.length ? `${dueReviews.length} items due${overdueReviews ? ` · ${overdueReviews} overdue` : " today"}` : revisionItems.length ? `${revisionItems.length} saved or in-progress items in your queue` : "Your review queue is clear"}</small></span><ArrowRight size={16}/></Link>
        <section className="dashboard-panel dashboard-actions" aria-labelledby="recommended-actions-title"><div className="dashboard-section-heading"><div><span className="eyebrow">Keep moving forward</span><h3 id="recommended-actions-title">Recommended next actions</h3></div></div>
          {readiness.recommendations.length ? <div className="dashboard-action-list">{readiness.recommendations.slice(0, 3).map((action) => <Link key={action.id} to={action.href}><span><strong>{action.title}</strong><small>{action.reason}</small></span><ArrowRight size={15}/></Link>)}</div> : <p className="dashboard-empty-copy">Complete a topic or try a practice set to get your next suggestions.</p>}
        </section>
        <div className="dashboard-focus-links"><Link to="/patterns"><Compass size={16}/>Explore DSA patterns<ArrowRight size={14}/></Link><Link to="/simulation"><TrendingUp size={16}/>Take a placement simulation<ArrowRight size={14}/></Link></div>
      </aside>
    </div>
  </div>;
}
