import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildRevisionQueue, calculateRevisionSchedule, localDateKey } from "../data/revisionQueue.js";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

const VIEWS = [["dueToday", "Due Today"], ["overdue", "Overdue"], ["upcoming", "Upcoming"], ["allSaved", "All Saved"]];
const OUTCOMES = [["again", "Again"], ["hard", "Hard"], ["gotIt", "Got it"], ["easy", "Easy"]];
const TYPE_LABELS = { topic: "Topic", resource: "Resource", coding: "Coding problem", mcq: "MCQ" };
const CATEGORY = [["all", "All types"], ["topic", "Topics"], ["resource", "Resources"], ["coding", "Coding problems"], ["mcq", "MCQs"]];

function openPath(entry) {
  const base = `/subjects/${entry.subjectId}/topics/${entry.topicId}`;
  return entry.type === "resource" ? `${base}#learn` : entry.type === "coding" || entry.type === "mcq" ? `${base}#practice` : `${base}#overview`;
}

function dateLabel(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

export default function RevisionPage() {
  const progressApi = useProgress();
  const [view, setView] = useState("dueToday");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const queue = useMemo(() => buildRevisionQueue(subjects, progressApi), [progressApi.progress]);
  const saved = queue.filter((entry) => entry.isSaved);
  const counts = {
    dueToday: queue.filter((entry) => entry.available && entry.dueStatus === "dueToday").length,
    overdue: queue.filter((entry) => entry.available && entry.dueStatus === "overdue").length,
    upcoming: queue.filter((entry) => entry.available && entry.dueStatus === "upcoming").length,
    allSaved: saved.length,
  };
  const entries = (view === "allSaved" ? saved : queue.filter((entry) => entry.available && entry.dueStatus === view))
    .filter((entry) => category === "all" || entry.type === category)
    .filter((entry) => `${entry.title} ${entry.subject?.name ?? entry.subjectId} ${entry.topic?.title ?? entry.topicId} ${entry.reason}`.toLowerCase().includes(search.trim().toLowerCase()));

  function record(entry, outcome) {
    const next = calculateRevisionSchedule(entry.schedule, outcome, localDateKey());
    progressApi.recordRevisionOutcome(entry, outcome);
    if (next) setNotice(`${entry.title}: next review due ${dateLabel(next.dueDate)}.`);
  }

  const emptyCopy = {
    dueToday: ["Nothing due today", "New saved or in-progress items appear here until their first review is scheduled."],
    overdue: ["No overdue reviews", "When an item's due date passes, it will appear here."],
    upcoming: ["No upcoming reviews", "Record a review outcome to schedule the next check-in."],
    allSaved: ["No saved items yet", "Save a topic, resource, problem, or MCQ from its learning page to keep it here."],
  }[view];

  return <div className="stack">
    <section className="hero-panel"><div><span className="eyebrow">Spaced review · rule-based schedule</span><h2>Revision queue</h2><p>Review saved material, incorrect answers, and topics you have started. Again: 1 day; Hard: 2; Got it: 4; Easy: 7. Successful reviews scale the next interval by 1.5× (rounded, capped at 30 days); Again resets the stage.</p></div><div className="revision-total"><strong>{counts.dueToday + counts.overdue}</strong><span>due or overdue</span></div></section>
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{notice}</p>
    <section className="content-section revision-controls">
      <div className="revision-categories" role="group" aria-label="Revision queue views">{VIEWS.map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} className={`revision-category${view === id ? " active" : ""}`} onClick={() => setView(id)}>{label} ({counts[id]})</button>)}</div>
      <div className="revision-filter-row"><label className="revision-search">Search queue<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, subject, or topic" /></label>
      {view === "allSaved" && <label className="revision-search revision-type-filter">Item type<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORY.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>}</div>
    </section>
    {entries.length ? <div className="revision-list">{entries.map((entry) => <article className={`revision-item revision-queue-item ${entry.dueStatus}`} key={entry.key}>
      <div className="revision-item-copy"><span className="eyebrow">{TYPE_LABELS[entry.type]} · {entry.subject?.name ?? entry.subjectId} · {entry.topic?.title ?? entry.topicId}</span><h3>{entry.title}</h3><p>{entry.reason}{entry.item?.platform ? ` · ${entry.item.platform}${entry.item.difficulty ? ` · ${entry.item.difficulty}` : ""}` : ""}</p>
        <div className={`revision-due-label ${entry.dueStatus}`}><strong>{entry.dueStatus === "overdue" ? "Overdue" : entry.dueStatus === "dueToday" ? "Due today" : `Due ${dateLabel(entry.dueDate)}`}</strong>{entry.schedule?.reviewCount > 0 && <span> · {entry.schedule.reviewCount} {entry.schedule.reviewCount === 1 ? "review" : "reviews"}</span>}{entry.schedule && <span> · Last: {entry.schedule.lastOutcome ?? "reviewed"}</span>}</div>
        {!entry.available && <p className="revision-unavailable">This saved item is no longer in the catalog. You can still remove it.</p>}
      </div>
      <div className="revision-item-actions revision-queue-actions">{entry.available && <Link className="secondary-button" to={openPath(entry)}>Open / Review</Link>}
        {entry.available && <div className="revision-outcomes" role="group" aria-label={`Record review outcome for ${entry.title}`}>{OUTCOMES.map(([outcome, label]) => <button type="button" key={outcome} onClick={() => record(entry, outcome)}>{label}</button>)}</div>}
        {!entry.isSaved && entry.type === "mcq" && <button className="secondary-button" type="button" onClick={() => progressApi.toggleSaved("mcq", entry.subjectId, entry.topicId, entry.itemId)}>Save</button>}
        {entry.isSaved && <button className="remove-saved-button" type="button" onClick={() => progressApi.removeSaved(entry)} aria-label={`Remove ${entry.title} from saved items`}>Remove</button>}
      </div>
    </article>)}</div> : <div className="empty-state"><h3>{search ? "No items match" : emptyCopy[0]}</h3><p>{search ? "Try a different search or item type." : emptyCopy[1]}</p></div>}
    {queue.some((entry) => !entry.available && entry.isSaved) && view !== "allSaved" && <p className="revision-stale-note">Some saved items are unavailable in the current catalog. Find and remove them in All Saved.</p>}
  </div>;
}
