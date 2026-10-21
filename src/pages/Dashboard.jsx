import { ArrowRight, BookOpen, CheckCircle2, CircleHelp, Code2, Compass, Layers3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import DailyMission from "../components/dashboard/DailyMission.jsx";
import { getPlacementPillars } from "../components/dashboard/placementMetrics.js";
import { buildRevisionQueue } from "../data/revisionQueue.js";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

const pillarIcons = { dsa: Code2, "core-cs": Layers3, aptitude: CircleHelp, "interview-prep": BookOpen };

function PillarCard({ pillar }) {
  const Icon = pillarIcons[pillar.id];
  const percent = pillar.totalTopics ? Math.round((pillar.completedTopics / pillar.totalTopics) * 100) : 0;

  return (
    <article className={`placement-pillar placement-pillar-${pillar.tone}`}>
      <div className="placement-pillar-top">
        <span className="placement-pillar-icon"><Icon size={18} /></span>
        <span className="placement-pillar-count">{pillar.availableSubjects.length || "—"} {pillar.availableSubjects.length === 1 ? "subject" : "subjects"}</span>
      </div>
      <h3>{pillar.title}</h3>
      {pillar.totalTopics ? (
        <>
          <div className="placement-topic-count"><strong>{pillar.completedTopics}</strong><span> / {pillar.totalTopics} topics complete</span></div>
          <ProgressBar value={percent} label={`${pillar.title} topic coverage`} />
        </>
      ) : <p className="placement-missing">No topics available in the current catalog.</p>}

      <div className="placement-detail-list">
        {pillar.totalCodingProblems > 0 && <div><span>Coding problems</span><strong>{pillar.completedCodingProblems} / {pillar.totalCodingProblems}</strong></div>}
        {pillar.totalQuestions > 0 && (
          <div><span>MCQs answered</span><strong>{pillar.answeredQuestions} / {pillar.totalQuestions}</strong></div>
        )}
        {pillar.totalQuestions > 0 && (
          <div><span>MCQ accuracy</span><strong>{pillar.accuracy === null ? "No answers yet" : `${pillar.accuracy}%`}</strong></div>
        )}
        {!pillar.totalCodingProblems && !pillar.totalQuestions && <div><span>Practice</span><strong>No practice items in catalog</strong></div>}
      </div>

      <div className="placement-pillar-links">
        {pillar.availableSubjects.map((subject) => (
          <Link key={subject.id} to={`/subjects/${subject.id}`} aria-label={`Open ${subject.name} roadmap`}>
            {subject.name}<ArrowRight size={13} />
          </Link>
        ))}
      </div>
    </article>
  );
}

export default function Dashboard() {
  const progressApi = useProgress();
  const pillars = getPlacementPillars(subjects, progressApi);
  const next = progressApi.getContinueLearning();
  const nextIsInProgress = next && !next.complete && progressApi.getTopicStatus(next.subject, next.topic).id === "inProgress";
  const hasValidRecommendation = next && !next.complete && next.subject?.id && next.topic?.id;
  const revisionQueue = buildRevisionQueue(subjects, progressApi);
  const dueReviews = revisionQueue.filter((entry) => entry.available && (entry.dueStatus === "dueToday" || entry.dueStatus === "overdue"));

  return (
    <div className="stack dashboard-page placement-dashboard">
      <header className="dashboard-heading">
        <div className="dashboard-greeting-mark"><Sparkles size={17} /></div>
        <div>
          <span className="eyebrow">Placement command center</span>
          <h2>Make your next step count.</h2>
          <p>A clear view of your preparation across problem solving, core CS, aptitude, and interviews.</p>
        </div>
      </header>

      {hasValidRecommendation ? (
        <section className="placement-recommendation">
          <div className="placement-recommendation-icon">{nextIsInProgress ? <BookOpen size={20} /> : <Compass size={20} />}</div>
          <div className="placement-recommendation-copy">
            <span className="eyebrow">{nextIsInProgress ? "Pick up where you left off" : "Next in your preparation path"}</span>
            <h3>{next.topic.title}</h3>
            <p>{nextIsInProgress ? "You have already started this topic. Continue where you left off." : "This is the first incomplete topic in the catalog's preparation order."}</p>
            <div className="placement-recommendation-context"><span>{next.subject.name}</span><span>{next.topic.level ?? "Roadmap topic"}</span></div>
          </div>
          <Link className="primary-button" to={`/subjects/${next.subject.id}/topics/${next.topic.id}`}>
            {nextIsInProgress ? "Continue topic" : "Start recommended topic"}<ArrowRight size={16} />
          </Link>
        </section>
      ) : next?.complete ? (
        <section className="placement-recommendation placement-recommendation-complete">
          <div className="placement-recommendation-icon"><CheckCircle2 size={20} /></div>
          <div className="placement-recommendation-copy">
            <span className="eyebrow">Roadmaps complete</span><h3>Every topic in the catalog is complete.</h3>
            <p>Review your overall progress or revisit saved study materials.</p>
          </div>
          <div className="placement-recommendation-actions">
            <Link className="secondary-button" to="/progress">View progress</Link>
            <Link className="primary-button" to="/revision">Open revision<ArrowRight size={16} /></Link>
          </div>
        </section>
      ) : (
        <section className="placement-recommendation">
          <div className="placement-recommendation-icon"><Compass size={20} /></div>
          <div className="placement-recommendation-copy"><span className="eyebrow">No recommendation available</span><h3>Explore your preparation paths.</h3><p>The catalog currently has no topics to recommend.</p></div>
          <Link className="primary-button" to="/subjects">Browse subjects<ArrowRight size={16} /></Link>
        </section>
      )}

      <DailyMission catalog={subjects} progressApi={progressApi} recommendation={next} />

      <Link className="dashboard-revision-reminder" to="/revision"><span><strong>{dueReviews.length ? `${dueReviews.length} review ${dueReviews.length === 1 ? "item" : "items"} due` : "Revision queue"}</strong><small>{dueReviews.length ? "Due today or overdue · review your saved and in-progress material" : "No reviews due today · check upcoming items"}</small></span><span className="dashboard-revision-cta">Open queue<ArrowRight size={15} /></span></Link>

      <section className="placement-pillars-section" aria-labelledby="placement-pillars-heading">
        <div className="section-title">
          <div><span className="eyebrow">Your preparation</span><h2 id="placement-pillars-heading">Four pillars, one plan</h2><p>Coverage uses unique catalog topics; practice figures use the items and answers saved in this browser.</p></div>
          <Link className="back-link" to="/progress">Detailed progress<ArrowRight size={15} /></Link>
        </div>
        <div className="placement-pillar-grid">
          {pillars.map((pillar) => <PillarCard key={pillar.id} pillar={pillar} />)}
        </div>
      </section>

      <nav className="placement-quick-links" aria-label="Preparation shortcuts">
        <Link to="/subjects"><Compass size={17} /><span><strong>Browse all subjects</strong><small>Open the complete subject catalog</small></span><ArrowRight size={15} /></Link>
        <Link to="/patterns"><Layers3 size={17} /><span><strong>Explore DSA patterns</strong><small>Learn techniques and find linked practice</small></span><ArrowRight size={15} /></Link>
        <Link to="/practice"><BookOpen size={17} /><span><strong>Practice</strong><small>Find coding problems and MCQs</small></span><ArrowRight size={15} /></Link>
      </nav>
    </div>
  );
}
