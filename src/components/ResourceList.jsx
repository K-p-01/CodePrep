import { ExternalLink, PlayCircle } from "lucide-react";
import BookmarkButton from "./BookmarkButton.jsx";

export default function ResourceList({ resources, subject, topic, progressApi }) {
  if (!resources.length) {
    return <p className="muted">Resources will be added here as this topic is expanded.</p>;
  }

  return (
    <div className="resource-list">
      {resources.map((resource) => {
        const bookmarkId = `resource:${subject.id}:${topic.id}:${resource.id}`;
        const bookmark = {
          id: bookmarkId,
          type: "Resource",
          title: resource.title,
          subtitle: `${resource.source} · ${resource.minutes} min`,
          subjectId: subject.id,
          subjectName: subject.name,
          topicId: topic.id,
          topicTitle: topic.title,
          to: `/subjects/${subject.id}/topics/${topic.id}`,
          url: resource.url,
        };
        return (
          <article key={resource.id} className="resource-item">
            <a href={resource.url || undefined} target="_blank" rel="noreferrer" className="resource-main">
              <div className="resource-icon">
                <PlayCircle size={19} />
              </div>
              <div>
                <span>{resource.type}</span>
                <strong>{resource.title}</strong>
                <small>
                  {resource.source} · {resource.minutes} min
                </small>
              </div>
              {resource.url ? <ExternalLink size={17} /> : null}
            </a>
            {progressApi ? (
              <BookmarkButton
                label="Save"
                bookmarked={progressApi.isBookmarked(bookmarkId)}
                onToggle={() => progressApi.toggleBookmark(bookmark)}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

