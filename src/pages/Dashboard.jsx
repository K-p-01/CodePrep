import { ArrowRight, BookMarked, CalendarDays, CircleCheck, Cloud, Clock, ListChecks, PlayCircle, RefreshCw, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import SubjectCard from "../components/SubjectCard.jsx";
import { useContent } from "../state/contentStore.jsx";
import { useProgress } from "../state/progressStore.js";
import { useAuth } from "../state/authStore.jsx";

export default function Dashboard() {
  const progressApi = useProgress();
  const { subjects, loading: contentLoading } = useContent();
  const { user } = useAuth();
  const { summary } = progressApi;
  const continueLearning = progressApi.getContinueLearning();
  const totalSubjects = subjects.length;
  const planner = progressApi.getPlannerSummary();

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Welcome back, {user?.name?.split(" ")[0] || "Learner"}</span>
          <h2>Follow a roadmap, learn from curated resources, practice, and keep your progress visible.</h2>
          <p>
            CodePrep brings DSA, CS fundamentals, aptitude, and interview preparation into one structured learning flow.
          </p>
        </div>
        <ProgressBar value={summary.percent} label="Overall progress" />
      </section>

      {continueLearning && (
        <section className="continue-panel">
          <div className="continue-icon">
            <PlayCircle size={24} />
          </div>
          <div>
            <span className="eyebrow">Continue Learning</span>
            <h2>{continueLearning.topic.title}</h2>
            <p>
              {continueLearning.reason} in {continueLearning.subject.name} · {continueLearning.topic.duration}
            </p>
          </div>
          <Link
            className="primary-button"
            to={`/subjects/${continueLearning.subject.id}/topics/${continueLearning.topic.id}`}
          >
            Continue
            <ArrowRight size={18} />
          </Link>
        </section>
      )}

      <section className="planner-callout">
        <div className="planner-callout-icon"><CalendarDays size={20} /></div>
        <div>
          <span className="eyebrow">Today's Plan</span>
          <h3>{planner.todayCompleted} / {planner.todayTotal} tasks completed</h3>
          <p>{planner.todayTotal ? "Keep the study session moving with your planned tasks." : "No tasks planned today yet."}</p>
        </div>
        <Link to="/planner" className="secondary-button">Open Planner</Link>
      </section>

      <section className="revision-callout">
        <div className="revision-callout-icon">
          <BookMarked size={20} />
        </div>
        <div>
          <span className="eyebrow">Revision</span>
          <h3>{progressApi.getBookmarks().length} saved item{progressApi.getBookmarks().length === 1 ? "" : "s"}</h3>
          <p>Keep difficult topics, resources, coding problems, and MCQs in one revision queue.</p>
        </div>
        <Link to="/revision" className="secondary-button">Open Revision</Link>
      </section>

      <section className="sync-panel">
        <div className="sync-panel-icon"><Cloud size={19} /></div>
        <div>
          <span className="eyebrow">Cloud Progress</span>
          <strong>{progressApi.syncStatus === "synced" ? "Progress synced to your account" : progressApi.syncStatus === "syncing" ? "Syncing your progress…" : progressApi.syncStatus === "error" ? "Cloud sync needs attention" : "Local progress"}</strong>
          <p>{progressApi.lastSyncedAt ? `Last synced ${progressApi.lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Sign in to keep progress available across devices."}</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => progressApi.syncNow().catch(() => {})}>
          <RefreshCw size={15} />
          Sync now
        </button>
      </section>

      {planner.todayTasks.length ? (
        <section className="content-section planner-mini-section">
          <div className="section-title compact"><div><h3>Today’s tasks</h3><p>Quick actions from your study planner.</p></div><Link to="/planner" className="inline-link">View planner</Link></div>
          <div className="planner-mini-list">
            {planner.todayTasks.slice(0, 4).map((task) => (
              <div className={`planner-mini-item ${task.completed ? "completed" : ""}`} key={task.id}>
                <button type="button" className={`task-check ${task.completed ? "done" : ""}`} onClick={() => progressApi.togglePlannerTask(task.id)}><CircleCheck size={15} /></button>
                <span>{task.title}</span>
                <small>{task.dueTime || task.kind}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="progress" className="stats-grid">
        <div className="stat-card">
          <BookMarked size={22} />
          <strong>{totalSubjects}</strong>
          <span>Subjects available</span>
        </div>
        <div className="stat-card">
          <Clock size={22} />
          <strong>{summary.subjectsStarted}</strong>
          <span>Subjects started</span>
        </div>
        <div className="stat-card">
          <Trophy size={22} />
          <strong>{summary.completedTopics}</strong>
          <span>Topics completed</span>
        </div>
        <div className="stat-card">
          <ListChecks size={22} />
          <strong>{summary.totalTopics}</strong>
          <span>Roadmap topics</span>
        </div>
        <div className="stat-card">
          <CircleCheck size={22} />
          <strong>{summary.practiceCompleted}</strong>
          <span>Practice items completed</span>
        </div>
        <div className="stat-card">
          <PlayCircle size={22} />
          <strong>{summary.percent}%</strong>
          <span>Overall progress</span>
        </div>
      </section>

      <section id="subjects" className="content-section flush">
        <div className="section-title">
          <div>
            <h2>Subjects</h2>
            <p>Choose a subject, follow its roadmap, and learn topic-by-topic with curated resources, notes, and practice.</p>
          </div>
        </div>
        <div className="subject-grid">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              progress={progressApi.getSubjectProgress(subject)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

