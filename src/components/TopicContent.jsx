import { BookOpen, CheckCircle2, FileText, Target } from "lucide-react";
import BookmarkButton from "./BookmarkButton.jsx";
import NotesPanel from "./NotesPanel.jsx";
import PracticePanel from "./PracticePanel.jsx";
import ResourceList from "./ResourceList.jsx";

export default function TopicContent({ subject, topic, complete, onToggleComplete, progressApi }) {
  return (
    <div className="topic-content">
      <section className="content-section">
        <div className="section-title">
          <BookOpen size={20} />
          <div>
            <h2>Learning Resources / Lectures</h2>
            <p>External links and lecture placeholders are topic data.</p>
          </div>
        </div>
        <ResourceList resources={topic.resources} subject={subject} topic={topic} progressApi={progressApi} />
      </section>

      <section className="content-section">
        <div className="section-title">
          <FileText size={20} />
          <div>
            <h2>Short Notes</h2>
            <p>Compact revision points for before practice.</p>
          </div>
        </div>
        <NotesPanel notes={topic.notes} />
      </section>

      <section className="content-section">
        <div className="section-title">
          <Target size={20} />
          <div>
            <h2>Practice</h2>
            <p>One reusable panel supports coding problems and MCQ-style checks.</p>
          </div>
        </div>
        <PracticePanel subject={subject} topic={topic} practice={topic.practice} progressApi={progressApi} />
      </section>

      <section className="completion-panel">
        <div>
          <span className="eyebrow">Progress</span>
          <h2>{complete ? `${topic.title} is marked complete` : `Mark ${topic.title} complete`}</h2>
          <p>
            Your progress is kept locally for resilience and synced to your CodePrep account when you are signed in.
          </p>
        </div>
        <div className="completion-actions">
          <BookmarkButton
            label="Save Topic"
            bookmarked={progressApi.isBookmarked(`topic:${subject.id}:${topic.id}`)}
            onToggle={() =>
              progressApi.toggleBookmark({
                id: `topic:${subject.id}:${topic.id}`,
                type: "Topic",
                title: topic.title,
                subtitle: `${subject.name} · ${topic.level} · ${topic.duration}`,
                subjectId: subject.id,
                subjectName: subject.name,
                topicId: topic.id,
                topicTitle: topic.title,
                to: `/subjects/${subject.id}/topics/${topic.id}`,
              })
            }
          />
          <button type="button" className="primary-button" onClick={onToggleComplete}>
            <CheckCircle2 size={18} />
            {complete ? "Completed" : "Mark Complete"}
          </button>
        </div>
      </section>

      <div className="data-note">
        Current route: {subject.name} / {topic.title}
      </div>
    </div>
  );
}

