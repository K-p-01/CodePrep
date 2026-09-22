import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar.jsx";

export default function SubjectCard({ subject, progress }) {
  const total = subject.topics.length;
  const percent = progress?.percent ?? 0;

  return (
    <Link className="subject-card" to={`/subjects/${subject.id}`} style={{ "--accent": subject.accent }}>
      <div className="subject-card-head">
        <div>
          <span className="subject-code">{subject.name}</span>
          <h3>{subject.fullName}</h3>
        </div>
        <ArrowRight size={20} />
      </div>
      <p>{subject.description}</p>
      <ProgressBar value={percent} label={`${subject.name} progress`} />
      <div className="subject-card-foot">
        <span>{total || "Coming soon"} topics</span>
        <span>{progress?.completedTopics ?? 0}/{total} completed</span>
      </div>
    </Link>
  );
}

