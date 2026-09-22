import { Bookmark, ExternalLink, FileText, HelpCircle, Map, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import BookmarkButton from "../components/BookmarkButton.jsx";
import { useProgress } from "../state/progressStore.js";

const FILTERS = [
  { id: "all", label: "All saved" },
  { id: "Topic", label: "Topics" },
  { id: "Resource", label: "Resources" },
  { id: "Coding Problem", label: "Problems" },
  { id: "MCQ", label: "MCQs" },
];

function iconFor(type) {
  if (type === "Topic") return Map;
  if (type === "MCQ") return HelpCircle;
  if (type === "Coding Problem") return PlayCircle;
  return FileText;
}

export default function RevisionPage() {
  const progressApi = useProgress();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const bookmarks = progressApi.getBookmarks();

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bookmarks
      .filter((item) => filter === "all" || item.type === filter)
      .filter((item) => {
        if (!normalized) return true;
        return `${item.title} ${item.subtitle} ${item.subjectName} ${item.topicTitle}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  }, [bookmarks, filter, query]);

  return (
    <div className="stack">
      <section className="revision-hero">
        <div>
          <span className="eyebrow">Revision Hub</span>
          <h2>Your saved learning queue.</h2>
          <p>Bookmark difficult topics, important resources, coding problems, and MCQs while you learn. Come back here when you need a focused revision session.</p>
        </div>
        <div className="revision-count">
          <Bookmark size={22} />
          <strong>{bookmarks.length}</strong>
          <span>saved items</span>
        </div>
      </section>

      <section className="content-section flush">
        <div className="revision-toolbar">
          <div className="revision-tabs">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? "filter-chip active" : "filter-chip"}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            className="revision-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved items..."
            aria-label="Search saved items"
          />
        </div>

        {results.length ? (
          <div className="revision-list">
            {results.map((item) => {
              const Icon = iconFor(item.type);
              return (
                <article key={item.id} className="revision-item">
                  <div className="revision-icon"><Icon size={20} /></div>
                  <div className="revision-copy">
                    <span>{item.subjectName} · {item.type}</span>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                    <small>{item.topicTitle}</small>
                  </div>
                  <div className="revision-actions">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="secondary-button">
                        <ExternalLink size={15} />
                        Open
                      </a>
                    ) : null}
                    <Link to={item.to} className="primary-button">
                      <PlayCircle size={15} />
                      Review
                    </Link>
                    <BookmarkButton
                      label="Remove"
                      bookmarked
                      onToggle={() => progressApi.toggleBookmark(item)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state revision-empty">
            <Bookmark size={32} />
            <h3>No saved items yet</h3>
            <p>Use Save on a topic, resource, coding problem, or MCQ and it will appear here for revision.</p>
          </div>
        )}
      </section>
    </div>
  );
}

