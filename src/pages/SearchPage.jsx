import { BookOpen, ExternalLink, FileText, HelpCircle, Search, Video } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useContent } from "../state/contentStore.jsx";

function buildIndex(subjects) {
  const items = [];
  subjects.forEach((subject) => {
    items.push({
      id: `subject-${subject.id}`,
      kind: "Subject",
      title: subject.name,
      description: subject.fullName,
      text: `${subject.name} ${subject.fullName} ${subject.description}`,
      to: `/subjects/${subject.id}`,
    });
    subject.topics.forEach((topic) => {
      items.push({
        id: `topic-${subject.id}-${topic.id}`,
        kind: "Topic",
        title: topic.title,
        description: topic.summary,
        text: `${subject.name} ${topic.title} ${topic.summary} ${(topic.notes || []).join(" ")}`,
        to: `/subjects/${subject.id}/topics/${topic.id}`,
        subject: subject.name,
      });
      (topic.resources || []).forEach((resource) => {
        items.push({
          id: `resource-${resource.id}`,
          kind: resource.type,
          title: resource.title,
          description: `${resource.source} · ${resource.minutes || 0} min`,
          text: `${subject.name} ${topic.title} ${resource.title} ${resource.source}`,
          url: resource.url,
          to: `/subjects/${subject.id}/topics/${topic.id}`,
          subject: subject.name,
        });
      });
      const practice = topic.practice ?? {};
      (practice.problems ?? []).forEach((problem) => {
        items.push({
          id: `problem-${problem.id}`,
          kind: "Coding Problem",
          title: problem.title,
          description: `${problem.platform} · ${problem.difficulty}`,
          text: `${subject.name} ${topic.title} ${problem.title} ${problem.topic || ""} ${problem.platform}`,
          url: problem.url,
          to: `/subjects/${subject.id}/topics/${topic.id}#practice`,
          subject: subject.name,
        });
      });
      (practice.questions ?? []).forEach((question) => {
        items.push({
          id: `question-${question.id}`,
          kind: "MCQ",
          title: question.prompt,
          description: `${topic.title} · ${question.difficulty}`,
          text: `${subject.name} ${topic.title} ${question.prompt} ${(question.options || []).join(" ")}`,
          to: `/subjects/${subject.id}/topics/${topic.id}#practice`,
          subject: subject.name,
        });
      });
    });
  });
  return items;
}

function iconFor(kind) {
  if (kind === "Subject" || kind === "Topic") return BookOpen;
  if (kind === "MCQ") return HelpCircle;
  if (kind === "Lecture") return Video;
  return FileText;
}

export default function SearchPage() {
  const { subjects, loading } = useContent();
  const index = useMemo(() => buildIndex(subjects), [subjects]);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const kinds = useMemo(() => [...new Set(index.map((item) => item.kind))], [index]);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return index.filter((item) => {
      const matchesQuery = !normalized || item.text.toLowerCase().includes(normalized);
      const matchesSubject = subjectFilter === "all" || item.subject === subjectFilter || (item.kind === "Subject" && item.title === subjectFilter);
      const matchesKind = kindFilter === "all" || item.kind === kindFilter;
      return matchesQuery && matchesSubject && matchesKind;
    }).slice(0, 80);
  }, [query, subjectFilter, kindFilter]);

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    setParams(next);
  }

  if (loading) return <div className="loading-panel">Loading search index…</div>;

  return (
    <div className="stack">
      <section className="search-hero">
        <span className="eyebrow">Search CodePrep</span>
        <h2>Find a topic, resource, or practice question.</h2>
        <p>Search across every subject without leaving the learning platform.</p>
        <form className="global-search" onSubmit={submit}>
          <Search size={20} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: normalization, arrays, deadlocks..." aria-label="Search CodePrep" />
          <button className="primary-button" type="submit">Search</button>
        </form>
      </section>

      <section className="content-section flush">
        <div className="search-toolbar">
          <div>
            <h2>{results.length} result{results.length === 1 ? "" : "s"}</h2>
            <p>Filter the result set to jump directly into the right material.</p>
          </div>
          <div className="search-filters">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label="Filter by subject">
              <option value="all">All subjects</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}
            </select>
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Filter by content type">
              <option value="all">All content</option>
              {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </div>
        </div>

        <div className="search-results">
          {results.length ? results.map((item) => {
            const Icon = iconFor(item.kind);
            const content = (
              <>
                <div className="search-result-icon"><Icon size={19} /></div>
                <div className="search-result-copy">
                  <span>{item.subject ? `${item.subject} · ` : ""}{item.kind}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
                {item.url ? <ExternalLink size={17} /> : null}
              </>
            );
            return item.url ? (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="search-result">{content}</a>
            ) : (
              <Link key={item.id} to={item.to} className="search-result">{content}</Link>
            );
          }) : (
            <div className="empty-state">
              <Search size={28} />
              <h3>No matching content</h3>
              <p>Try a broader keyword or remove one of the filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

