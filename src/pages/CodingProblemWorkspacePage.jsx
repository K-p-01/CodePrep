import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ExternalLink, Lightbulb, Save, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import NotFoundState from "../components/layout/NotFoundState.jsx";
import SaveButton from "../components/SaveButton.jsx";
import { CODING_ATTEMPT_OUTCOMES, CODING_NOTE_FIELDS, getNextIncompleteProblem, getSafeCodingProblemUrl } from "../data/codingPractice.js";
import { dsaPatterns } from "../data/dsaPatterns.js";
import { getSubject, getTopic } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

function CatalogValue({ value }) {
  if (typeof value === "string" || typeof value === "number") return <p>{String(value)}</p>;
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={index}><CatalogValue value={item} /></li>)}</ul>;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => typeof item === "string" || typeof item === "number" || Array.isArray(item));
    return entries.length ? <dl>{entries.map(([label, item]) => <div key={label}><dt>{label.replace(/([A-Z])/g, " $1")}</dt><dd><CatalogValue value={item} /></dd></div>)}</dl> : null;
  }
  return null;
}

function asCatalogList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function formatDate(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp)) : "Date unavailable";
}

function ProblemContent({ problem, url }) {
  const statement = problem.statement ?? problem.problemStatement ?? problem.description;
  const examples = asCatalogList(problem.examples);
  const constraints = asCatalogList(problem.constraints);
  const hints = asCatalogList(problem.hints);
  const hasProvidedBrief = Boolean((typeof statement === "string" && statement.trim()) || examples.length || constraints.length || hints.length);
  return <section className="content-section coding-workspace-brief" aria-labelledby="coding-brief-heading">
    <div className="section-title"><div><span className="eyebrow">Problem brief</span><h2 id="coding-brief-heading">Work through the problem</h2></div></div>
    {statement && <div className="coding-catalog-content"><h3>Statement</h3><CatalogValue value={statement} /></div>}
    {examples.length > 0 && <div className="coding-catalog-content"><h3>Examples</h3>{examples.map((example, index) => <div className="coding-example" key={index}><strong>Example {index + 1}</strong><CatalogValue value={example} /></div>)}</div>}
    {constraints.length > 0 && <div className="coding-catalog-content"><h3>Constraints</h3><CatalogValue value={constraints} /></div>}
    {hints.length > 0 && <div className="coding-catalog-content"><h3>Available hints</h3><ol>{hints.map((hint, index) => <li key={index}><CatalogValue value={hint} /></li>)}</ol></div>}
    {!hasProvidedBrief && <div className="coding-workspace-empty-brief"><BookOpen size={19} aria-hidden="true" /><div><strong>Prompt details are not in the CodePrep catalog yet.</strong><p>Use the existing problem source to read the statement, examples, and constraints. No prompt text or solution has been inferred.</p>{url && <a href={url} target="_blank" rel="noopener noreferrer">Open {problem.platform || "problem source"}<ExternalLink size={14} /></a>}</div></div>}
  </section>;
}

function CodingProblemWorkspace({ subject, topic, problem, progressApi }) {
  const workspace = progressApi.getCodingPractice(subject.id, topic.id, problem.id);
  const savedNotes = workspace.notes;
  const [draftNotes, setDraftNotes] = useState(savedNotes);
  const [saveMessage, setSaveMessage] = useState("");
  const [outcome, setOutcome] = useState("still-working");
  const [reflection, setReflection] = useState("");
  const [attemptMessage, setAttemptMessage] = useState("");
  const completed = progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id);
  const saved = progressApi.isSaved("coding", subject.id, topic.id, problem.id);
  const sourceUrl = getSafeCodingProblemUrl(problem.url);
  const patterns = subject.id === "dsa" ? dsaPatterns.filter((pattern) =>
    pattern.references?.some((reference) => reference.topicId === topic.id && reference.problemIds?.includes(problem.id)),
  ) : [];
  const nextProblem = getNextIncompleteProblem(topic.practice?.problems, problem.id,
    (problemId) => progressApi.isCodingProblemComplete(subject.id, topic.id, problemId));
  const isDirty = JSON.stringify(draftNotes) !== JSON.stringify(savedNotes);
  const latestAttempt = workspace.attempts[0] ?? null;
  const lastPracticeDate = latestAttempt?.timestamp ? formatDate(latestAttempt.timestamp) : "No recorded attempts";
  const displayedSaveMessage = isDirty ? "Unsaved changes" : saveMessage === "Unsaved changes" ? "All changes match the saved notes." : saveMessage;

  function updateNote(field, value) {
    setDraftNotes((current) => ({ ...current, [field]: value }));
    setSaveMessage("Unsaved changes");
  }

  function saveNotes(event) {
    event.preventDefault();
    progressApi.saveCodingPracticeNotes(subject.id, topic.id, problem.id, draftNotes);
    setSaveMessage("Notes saved in this browser.");
  }

  function recordAttempt(event) {
    event.preventDefault();
    progressApi.recordCodingAttempt(subject.id, topic.id, problem.id, { outcome, reflection });
    setReflection("");
    setOutcome("still-working");
    setAttemptMessage("Attempt recorded as self-reported activity.");
  }

  return <div className="stack coding-workspace-page">
    <nav className="coding-workspace-breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Dashboard</Link><span aria-hidden="true">/</span><Link to="/practice">Practice</Link><span aria-hidden="true">/</span><Link to={`/subjects/${subject.id}/topics/${topic.id}#practice`}>{subject.name} · {topic.title}</Link>
    </nav>
    <header className="coding-workspace-heading">
      <div><span className="eyebrow">{subject.name} · {topic.title} · Coding workspace</span>
        <h2>{problem.title}</h2><div className="coding-workspace-tags">
          {problem.difficulty && <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>}
          {problem.platform && <span className="coding-workspace-platform">{problem.platform}</span>}
          <span className={`status-badge ${completed ? "completed" : "notStarted"}`}>{completed ? "Completed" : "Not completed"}</span>
        </div>
      </div>
      <div className="coding-workspace-primary-actions">
        {sourceUrl ? <a className="primary-button" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open source problem<ExternalLink size={15} /></a> : <span className="resource-unavailable">Problem source unavailable</span>}
        <SaveButton saved={saved} onToggle={() => progressApi.toggleSaved("coding", subject.id, topic.id, problem.id)} itemLabel={problem.title} />
      </div>
    </header>

    {draftNotes.approach || draftNotes.mistakeToAvoid ? <aside className="coding-retry-reminder" aria-label="Review your notes before retrying"><Lightbulb size={17} aria-hidden="true" /><div><strong>Review your notes before retrying</strong>
      {draftNotes.approach && <p><b>My approach:</b> {draftNotes.approach}</p>}{draftNotes.mistakeToAvoid && <p><b>Mistake to avoid:</b> {draftNotes.mistakeToAvoid}</p>}
    </div></aside> : null}

    <div className="coding-workspace-overview-grid">
      <ProblemContent problem={problem} url={sourceUrl} />
      <aside className="content-section coding-workspace-context" aria-label="Problem context and status">
        <div className="section-title"><div><span className="eyebrow">Your practice record</span><h2>At a glance</h2></div></div>
        <dl className="coding-workspace-summary">
          <div><dt>Recorded attempts</dt><dd>{workspace.attemptCount}</dd></div>
          <div><dt>Most recent outcome</dt><dd>{latestAttempt ? CODING_ATTEMPT_OUTCOMES.find(([value]) => value === latestAttempt.outcome)?.[1] ?? "Recorded" : "No attempts yet"}</dd></div>
          <div><dt>Completion</dt><dd>{completed ? "Marked complete" : "Not complete"}</dd></div>
          <div><dt>Last practice date</dt><dd>{lastPracticeDate}</dd></div>
        </dl>
        <div className="coding-workspace-completion-action">
          <button type="button" className={completed ? "complete-button done" : "complete-button"} aria-pressed={completed} onClick={() => progressApi.toggleCodingProblem(subject.id, topic.id, problem.id)}>
            <CheckCircle2 size={17} />{completed ? "Mark incomplete" : "Mark completed"}
          </button>
          <small>Self-reported status. CodePrep does not run or grade code.</small>
        </div>
        {patterns.length > 0 ? <div className="coding-patterns"><span className="eyebrow">Linked DSA pattern{patterns.length > 1 ? "s" : ""}</span><div>{patterns.map((pattern) => <span key={pattern.id}>{pattern.name}</span>)}</div><Link to="/patterns">Review Pattern Explorer<ArrowRight size={14} /></Link></div>
          : subject.id === "dsa" && <p className="coding-pattern-unavailable">No DSA pattern is linked to this problem in the current catalog.</p>}
        {nextProblem ? <Link className="coding-next-problem" to={`/practice/${subject.id}/${topic.id}/${nextProblem.id}`}><span><small>Continue in topic order</small><strong>{nextProblem.title}</strong></span><ArrowRight size={17} /></Link> : <p className="coding-no-next">No other incomplete problem follows this one in the current topic.</p>}
        <Link className="coding-back-topic" to={`/subjects/${subject.id}/topics/${topic.id}#practice`}><ArrowLeft size={14} />Back to {topic.title} practice</Link>
      </aside>
    </div>

    <div className="coding-workspace-detail-grid">
      <section className="content-section coding-workspace-notes" aria-labelledby="coding-notes-heading">
        <div className="section-title"><div><span className="eyebrow">Private to this browser</span><h2 id="coding-notes-heading">Approach and reflection</h2><p>These are your notes and estimates, not verified solutions or complexity answers.</p></div></div>
        <form onSubmit={saveNotes}>
          <div className="coding-notes-grid">{CODING_NOTE_FIELDS.map(([field, label]) => <label className={`coding-note-field ${field}`} key={field}>{label}
            <textarea value={draftNotes[field] ?? ""} maxLength={4000} rows={field.includes("Complexity") ? 2 : 3} onChange={(event) => updateNote(field, event.target.value)} placeholder={field === "approach" ? "Outline the strategy you want to try…" : field === "mistakeToAvoid" ? "What should you check carefully next time?" : "Add your own notes…"} />
          </label>)}</div>
          <div className="coding-notes-actions"><button className="primary-button" type="submit" disabled={!isDirty}><Save size={15} />Save notes</button><span role="status" aria-live="polite">{displayedSaveMessage || "Changes are saved when you choose Save notes."}</span></div>
        </form>
      </section>

      <section className="content-section coding-workspace-attempts" aria-labelledby="coding-attempt-heading">
        <div className="section-title"><div><span className="eyebrow">Self-reported practice</span><h2 id="coding-attempt-heading">Record an attempt</h2><p>Use an outcome to keep a lightweight history. This does not submit code for grading.</p></div></div>
        <form onSubmit={recordAttempt} className="coding-attempt-form">
          <label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value)}>{CODING_ATTEMPT_OUTCOMES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Reflection (optional)<textarea value={reflection} maxLength={2000} rows={3} onChange={(event) => setReflection(event.target.value)} placeholder="What worked, or what will you try next?" /></label>
          <div className="coding-attempt-submit"><button className="secondary-button" type="submit">Record attempt<ArrowRight size={15} /></button><span role="status" aria-live="polite">{attemptMessage}</span></div>
        </form>
        <div className="coding-attempt-history"><h3>Recent attempts <span>{workspace.attempts.length} shown · {workspace.attemptCount} total</span></h3>
          {workspace.attempts.length ? <ol>{workspace.attempts.map((attempt) => <li key={attempt.id}>
            <div><strong>{CODING_ATTEMPT_OUTCOMES.find(([value]) => value === attempt.outcome)?.[1] ?? "Recorded attempt"}</strong><time dateTime={attempt.timestamp}>{formatDate(attempt.timestamp)}</time></div>
            {attempt.reflection && <p>{attempt.reflection}</p>}
          </li>)}</ol> : <p className="coding-attempt-empty">No attempts recorded. Add an entry after a practice session or review.</p>}
        </div>
      </section>
    </div>

    <p className="coding-workspace-disclaimer"><ShieldCheck size={15} aria-hidden="true" />Attempts and completion are self-reported. CodePrep does not execute code, verify submissions, or determine whether a solution is correct.</p>
  </div>;
}

export default function CodingProblemWorkspacePage() {
  const { subjectId, topicId, problemId } = useParams();
  const progressApi = useProgress();
  const subject = getSubject(subjectId);
  const topic = getTopic(subjectId, topicId);
  const problem = topic?.practice?.problems?.find((item) => item.id === problemId);
  if (!subject || !topic || !problem) return <NotFoundState title="Coding problem not found" message="This problem is not in the current subject and topic catalog." backTo="/practice" backLabel="Back to Practice" />;
  return <CodingProblemWorkspace key={`${subject.id}:${topic.id}:${problem.id}`} subject={subject} topic={topic} problem={problem} progressApi={progressApi} />;
}
