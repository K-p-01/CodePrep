import { useParams } from "react-router-dom";
import NotFoundState from "../components/layout/NotFoundState.jsx";
import ProgressBar from "../components/dashboard/ProgressBar.jsx";
import RoadmapList from "../components/roadmap/RoadmapList.jsx";
import { getSubject } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function SubjectPage() {
  const { subjectId } = useParams();
  const subject = getSubject(subjectId);
  const progressApi = useProgress();

  if (!subject) {
    return <NotFoundState
      title="Subject not found"
      message={`There is no subject with the ID “${subjectId}”. Choose a subject from the catalog to continue.`}
    />;
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
            <p>{subject.modules?.length ? `${subject.modules.length} guided stages · ` : ""}Open any topic to learn, revise, practice, and update your progress.</p>
          </div>
        </div>
        <RoadmapList subject={subject} progressApi={progressApi} />
      </section>
    </div>
  );
}
