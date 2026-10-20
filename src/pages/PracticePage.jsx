import { Link } from "react-router-dom";
import PracticePanel from "../components/practice/PracticePanel.jsx";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function PracticePage() {
  const progressApi = useProgress();
  const availableTopics = subjects.flatMap((subject) =>
    subject.topics
      .filter((topic) => (topic.practice?.problems?.length ?? 0) + (topic.practice?.questions?.length ?? 0) > 0)
      .map((topic) => ({ subject, topic })),
  );

  return (
    <div className="stack">
      <section className="content-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">Practice library</span>
            <h2>Practice</h2>
            <p>Practice is rendered from each topic’s data, using reusable coding and MCQ components.</p>
          </div>
        </div>
      </section>
      {availableTopics.length ? availableTopics.map(({ subject, topic }) => (
        <section className="content-section" key={`${subject.id}:${topic.id}`}>
          <div className="section-title">
            <div>
              <span className="eyebrow">{subject.name} · {topic.title}</span>
              <h2>{topic.title} practice</h2>
            </div>
            <Link className="back-link" to={`/subjects/${subject.id}/topics/${topic.id}`}>Open topic</Link>
          </div>
          <PracticePanel subject={subject} topic={topic} practice={topic.practice} progressApi={progressApi} />
        </section>
      )) : (
        <div className="empty-state"><h3>No practice added yet</h3><p>Practice sets will appear here when topic data includes questions or problems.</p></div>
      )}
    </div>
  );
}
