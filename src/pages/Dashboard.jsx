import { ArrowRight, BookMarked, CircleCheck, Clock, ListChecks, PlayCircle, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import SubjectCard from "../components/dashboard/SubjectCard.jsx";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function Dashboard() {
  const progressApi = useProgress();
  const { summary } = progressApi;
  const continueLearning = progressApi.getContinueLearning();
  const totalSubjects = subjects.length;

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">MVP vertical slice</span>
          <h2>Start with DSA, follow the roadmap, finish Arrays, and watch progress update.</h2>
          <p>
            CodePrep keeps placement prep organized around subjects, roadmaps, topics, resources,
            notes, practice, and completion tracking.
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

      <section id="progress" className="stats-grid">
        <div className="stat-card">
          <BookMarked size={22} />
          <strong>{totalSubjects}</strong>
          <span>Subjects modeled</span>
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
            <p>Subjects are data entries. DSA is populated first; the rest are ready for future content.</p>
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
