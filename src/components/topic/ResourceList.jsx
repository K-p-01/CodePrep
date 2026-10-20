import { ExternalLink, PlayCircle } from "lucide-react";

export default function ResourceList({ resources }) {
  if (!resources.length) {
    return <p className="muted">Resources will be added here as this topic is expanded.</p>;
  }

  return (
    <div className="resource-list">
      {resources.map((resource) => (
        <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="resource-item">
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
          <ExternalLink size={17} />
        </a>
      ))}
    </div>
  );
}
