import { BookOpen, Code2, ExternalLink, FileText, Globe2, PlayCircle } from "lucide-react";
import SaveButton from "../SaveButton.jsx";

function getResourceIcon(type = "") {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("video") || normalizedType.includes("lecture") || normalizedType.includes("youtube")) return PlayCircle;
  if (normalizedType.includes("book")) return BookOpen;
  if (normalizedType.includes("article")) return FileText;
  if (normalizedType.includes("practice") || normalizedType.includes("platform")) return Code2;
  if (normalizedType.includes("documentation")) return Globe2;
  return FileText;
}

function getSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function ResourceList({ resources, subject, topic, progressApi }) {
  const availableResources = Array.isArray(resources) ? resources.filter((resource) => resource && typeof resource === "object") : [];
  if (!availableResources.length) {
    return (
      <div className="topic-empty-state">
        <strong>No learning resources yet</strong>
        <p>Resources for this topic will appear here when they are added.</p>
      </div>
    );
  }

  return (
    <div className="resource-list">
      {availableResources.map((resource, index) => {
        const Icon = getResourceIcon(resource.type);
        const href = getSafeExternalUrl(resource.url);
        const source = resource.source ?? resource.provider;
        const duration = resource.duration ?? (resource.minutes ? `${resource.minutes} min` : null);

        return (
          <article key={resource.id ?? `${resource.title}-${index}`} className="resource-item">
            <div className="resource-icon" aria-hidden="true">
              <Icon size={19} />
            </div>
            <div className="resource-copy">
              <span>{resource.type || "Resource"}</span>
              <strong>{resource.title || "Untitled resource"}</strong>
              {source && <small>{source}</small>}
              {(resource.language || resource.difficulty) && <small>{[resource.language, resource.difficulty].filter(Boolean).join(" · ")}</small>}
              {duration && <small>{duration}</small>}
              {resource.description && <p>{resource.description}</p>}
            </div>
            <div className="resource-actions">
              {href ? <a className="resource-action" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${resource.title || "resource"} in a new tab`}>Open Resource <ExternalLink size={15} aria-hidden="true" /></a> : <span className="resource-unavailable">Link unavailable</span>}
              {resource.id && subject && topic && progressApi && <SaveButton saved={progressApi.isSaved("resource", subject.id, topic.id, resource.id)} onToggle={() => progressApi.toggleSaved("resource", subject.id, topic.id, resource.id)} itemLabel={resource.title || "resource"} />}
            </div>
          </article>
        );
      })}
    </div>
  );
}
