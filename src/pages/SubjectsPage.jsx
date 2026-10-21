import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import SubjectCard from "../components/dashboard/SubjectCard.jsx";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function SubjectsPage() {
  const progressApi = useProgress();

  return (
    <div className="stack">
      <section className="content-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">Your learning library</span>
            <h2>Subjects</h2>
            <p>Choose a subject to open its roadmap. Topic resources and practice are added where available.</p>
          </div>
        </div>
        <div className="subject-grid">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} progress={progressApi.getSubjectProgress(subject)} />
          ))}
        </div>
      </section>
      <section className="content-section">
        <div className="section-title">
          <div>
            <h2>Start the DSA roadmap</h2>
            <p>Follow the topics in order, starting with Arrays.</p>
          </div>
          <ArrowRight size={20} />
        </div>
        <Link className="primary-button" to="/subjects/dsa">Open DSA</Link>
      </section>
    </div>
  );
}
