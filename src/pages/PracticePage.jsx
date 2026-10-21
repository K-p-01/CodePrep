import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PracticePanel from "../components/practice/PracticePanel.jsx";
import PracticeFilters from "../components/practice/PracticeFilters.jsx";
import { DEFAULT_PRACTICE_FILTERS, filterPracticeItems, getPracticeFilterOptions } from "../components/practice/practiceUtils.js";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

export default function PracticePage() {
  const progressApi = useProgress();
  const [filters, setFilters] = useState(DEFAULT_PRACTICE_FILTERS);
  const availableTopics = useMemo(() => subjects.flatMap((subject) =>
    (Array.isArray(subject.topics) ? subject.topics : [])
      .filter((topic) => (topic.practice?.problems?.length ?? 0) + (topic.practice?.questions?.length ?? 0) > 0)
      .map((topic) => ({ subject, topic, practice: topic.practice })),
  ), []);
  const options = useMemo(() => getPracticeFilterOptions(availableTopics, progressApi), [availableTopics, progressApi.progress]);
  const results = availableTopics.map((context) => ({ ...context, items: filterPracticeItems({ ...context, filters, progressApi }) }))
    .filter(({ items }) => items.problems.length + items.questions.length > 0);
  const visibleItemCount = results.reduce((total, { items }) => total + items.problems.length + items.questions.length, 0);

  return <div className="stack practice-page">
    <section className="practice-workspace-header">
      <div className="practice-page-title"><span className="eyebrow">Practice workspace</span><h2>Build skill through deliberate practice.</h2><p>Find a problem or question across your available subjects, then record your progress as you go.</p></div>
      <div className="practice-results-count"><strong>{visibleItemCount}</strong><span>matching<br />practice items</span></div>
    </section>
    <section className="content-section practice-control-surface">
      <div className="section-title"><div><span className="eyebrow">Refine your session</span><h3>Practice library</h3><p>Filter by subject, topic, format, difficulty, or completion.</p></div></div>
      <PracticeFilters filters={filters} options={options} onChange={setFilters} visibleFilters={["subject", "topic", "type", "difficulty", "status"]} />
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{visibleItemCount} practice items across {results.length} topics match the current filters.</p>
    </section>
    {results.length ? results.map(({ subject, topic, practice, items }) => <section className="content-section practice-result" key={`${subject.id}:${topic.id}`}>
      <div className="section-title"><div><span className="eyebrow">{subject.name} · {topic.title}</span><h2>{topic.title}</h2><p>{items.problems.length} coding problems · {items.questions.length} MCQs</p></div><Link className="back-link" to={`/subjects/${subject.id}/topics/${topic.id}`}>Open topic</Link></div>
      <PracticePanel subject={subject} topic={topic} practice={practice} progressApi={progressApi} filters={filters} onFiltersChange={setFilters} filterOptions={options} filteredItems={items} showFilters={false} />
    </section>) : <div className="empty-state"><h3>{availableTopics.length ? "No practice matches these filters" : "No practice content is available"}</h3><p>{availableTopics.length ? "Clear or adjust the filters to see available problems and questions." : "There are no coding problems or MCQs in the current catalog yet. Browse a subject roadmap to continue studying."}</p>{availableTopics.length > 0 ? <button type="button" className="secondary-button" onClick={() => setFilters({ ...DEFAULT_PRACTICE_FILTERS })}>Clear filters</button> : <Link className="secondary-button" to="/subjects">Browse subject roadmaps</Link>}</div>}
  </div>;
}
