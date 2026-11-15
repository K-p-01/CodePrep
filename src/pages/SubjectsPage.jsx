import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import SubjectCard from "../components/dashboard/SubjectCard.jsx";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function SubjectsPage() {
  const progressApi = useProgress();
  const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
  const completedTopics = subjects.reduce((sum, subject) => sum + subject.topics.filter((topic) => progressApi.isTopicComplete(subject.id, topic.id)).length, 0);
  return <div className="subjects-page">
    <header className="subjects-intro"><div><span className="eyebrow">Learning library</span><h2>Explore subjects</h2><p>Choose a guided roadmap, follow topics in order, and track your progress as you prepare.</p></div><div className="subjects-intro-summary"><BookOpen size={17}/><span><strong>{subjects.length} roadmaps</strong><small>{completedTopics} of {totalTopics} topics complete</small></span></div></header>
    <div className="subject-grid subjects-catalog-grid">{subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} progress={progressApi.getSubjectProgress(subject)}/>)}</div>
    <Link className="subjects-roadmap-callout" to="/subjects/dsa"><span><strong>Start with the DSA roadmap</strong><small>Move from foundations through common interview patterns.</small></span><span className="primary-button">Open DSA roadmap<ArrowRight size={15}/></span></Link>
  </div>;
}
