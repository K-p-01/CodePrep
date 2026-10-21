import { ArrowRight, BookOpen, Braces, Code2, Database, Network, Cpu, Sigma, MessageSquareCode } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar.jsx";
import { getSubjectMetadata } from "../../data/subjects.js";

const subjectIcons = {
  dsa: Code2,
  dbms: Database,
  os: Cpu,
  cn: Network,
  oop: Braces,
  aptitude: Sigma,
  "interview-prep": MessageSquareCode,
};

export default function SubjectCard({ subject, progress }) {
  const { topicCount, estimatedHours } = getSubjectMetadata(subject);
  const percent = progress?.percent ?? 0;
  const Icon = subjectIcons[subject.id] ?? BookOpen;

  return (
    <Link className="subject-card" to={`/subjects/${subject.id}`} style={{ "--accent": subject.accent }}>
      <div className="subject-card-head">
        <div className="subject-icon" style={{ "--accent": subject.accent }}><Icon size={20} /></div>
        <div className="subject-card-heading"><span className="subject-code">{subject.name}</span><h3>{subject.fullName}</h3></div>
        <ArrowRight className="subject-card-arrow" size={19} />
      </div>
      <p>{subject.description}</p>
      <ProgressBar value={percent} label={`${subject.name} progress`} />
      <div className="subject-card-foot">
        <span><strong>{progress?.completedTopics ?? 0}</strong> of {topicCount} topics complete</span>
        {estimatedHours !== null && <span>{estimatedHours}h estimated</span>}
      </div>
      <div className="subject-card-action">
        <span>Open roadmap</span>
        <ArrowRight size={16} />
      </div>
    </Link>
  );
}
