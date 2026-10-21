import { BookOpen, CheckCircle2, FileText, Target } from "lucide-react";
import NotesPanel from "./NotesPanel.jsx";
import PracticePanel from "../practice/PracticePanel.jsx";
import ResourceList from "./ResourceList.jsx";

export default function TopicContent({ subject, topic, complete, onToggleComplete, progressApi }) {
  const resources = topic.resources ?? [];
  const notes = topic.notes ?? [];

  return (
    <div className="topic-content">
      <section id="learn" className="content-section topic-learning-section">
        <div className="section-title">
          <BookOpen size={20} />
          <div>
            <h2>Learning Resources / Lectures</h2>
            <p>Work through the available materials, then review your notes before practice.</p>
          </div>
        </div>
        <ResourceList resources={resources} subject={subject} topic={topic} progressApi={progressApi} />
      </section>

      <section id="notes" className="content-section topic-learning-section">
        <div className="section-title">
          <FileText size={20} />
          <div>
            <h2>Short Notes</h2>
            <p>Compact revision points for before practice.</p>
          </div>
        </div>
        <NotesPanel notes={notes} />
      </section>

      <section id="practice" className="content-section topic-learning-section">
        <div className="section-title">
          <Target size={20} />
          <div>
            <h2>Practice</h2>
            <p>Apply what you learned with the practice available for this topic.</p>
          </div>
        </div>
        <PracticePanel subject={subject} topic={topic} practice={topic.practice} progressApi={progressApi} />
      </section>

      <section id="completion" className="completion-panel topic-learning-section" aria-live="polite">
        <div>
          <span className="eyebrow">Progress</span>
          <h2>{complete ? `${topic.title} is marked complete` : `Mark ${topic.title} complete`}</h2>
          <p>Your completion state is saved locally in this browser.</p>
        </div>
        <button type="button" className="primary-button" onClick={onToggleComplete} aria-pressed={complete}>
          <CheckCircle2 size={18} />
          {complete ? "Completed" : "Mark Complete"}
        </button>
      </section>

      <div className="data-note">
        Current route: {subject.name} / {topic.title}
      </div>
    </div>
  );
}
