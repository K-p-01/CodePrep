import { Navigate, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import RoadmapList from "../components/RoadmapList.jsx";
import { useContent } from "../state/contentStore.jsx";
import { useProgress } from "../state/progressStore.js";

export default function SubjectPage() {
  const { subjectId } = useParams();
  const { subjects, loading } = useContent();
  const subject = subjects.find((item) => item.id === subjectId);
  const progressApi = useProgress();

  if (loading) return <div className="loading-panel">Loading subject…</div>;

  if (!subject) {
    return <Navigate to="/" replace />;
  }

  const subjectProgress = progressApi.getSubjectProgress(subject);

  return (
    <div className="stack">
      <section className="subject-hero" style={{ "--accent": subject.accent }}>
        <div>
          <span className="eyebrow">{subject.name} Roadmap</span>
          <h2>{subject.fullName}</h2>
          <p>{subject.description}</p>
        </div>
        <ProgressBar value={subjectProgress.percent} label={`${subject.name} progress`} />
      </section>

      <section className="content-section flush">
        <div className="section-title">
          <div>
            <h2>Roadmap</h2>
            <p>Topics update automatically as practice and completion progress is saved.</p>
          </div>
        </div>
        <RoadmapList subject={subject} progressApi={progressApi} />
      </section>
    </div>
  );
}

