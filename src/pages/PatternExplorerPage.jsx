import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, RotateCcw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import CodingProblem from "../components/practice/CodingProblem.jsx";
import { dsaPatterns } from "../data/dsaPatterns.js";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

function getPatternProblems(pattern, subject) {
  const seen = new Set();
  return pattern.references.flatMap((reference) => {
    const topic = subject?.topics?.find((entry) => entry.id === reference.topicId);
    return (reference.problemIds ?? []).flatMap((problemId) => {
      const problem = topic?.practice?.problems?.find((entry) => entry.id === problemId);
      if (!topic || !problem) return [];
      const key = `${subject.id}:${topic.id}:${problem.id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ subject, topic, problem, key }];
    });
  });
}

function matchesSearch(pattern, value) {
  return `${pattern.name} ${pattern.description} ${pattern.whenToConsider} ${pattern.clues.join(" ")}`.toLowerCase().includes(value.trim().toLowerCase());
}

export default function PatternExplorerPage() {
  const progressApi = useProgress();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(dsaPatterns[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState("all");
  const [completion, setCompletion] = useState("all");
  const dsa = subjects.find((subject) => subject.id === "dsa");
  const indexedPatterns = useMemo(() => dsaPatterns.map((pattern) => ({ ...pattern, problems: getPatternProblems(pattern, dsa) })), [dsa]);
  const allUniqueProblems = new Map(indexedPatterns.flatMap(({ problems }) => problems).map((entry) => [entry.key, entry]));
  const solvedUniqueCount = [...allUniqueProblems.values()].filter(({ subject, topic, problem }) => progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)).length;
  const visiblePatterns = indexedPatterns.filter((pattern) => matchesSearch(pattern, search));
  const selected = visiblePatterns.find((pattern) => pattern.id === selectedId) ?? visiblePatterns[0] ?? null;
  const filteredProblems = selected?.problems.filter(({ subject, topic, problem }) => {
    const solved = progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id);
    return (difficulty === "all" || problem.difficulty === difficulty) &&
      (completion === "all" || (completion === "solved" ? solved : !solved));
  }) ?? [];
  const solvedInPattern = selected?.problems.filter(({ subject, topic, problem }) => progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)).length ?? 0;

  function clearFilters() {
    setSearch(""); setDifficulty("all"); setCompletion("all");
  }

  return <div className="stack pattern-explorer-page">
    <header className="pattern-explorer-heading">
      <div><span className="eyebrow">DSA learning workspace</span><h2>Pattern Explorer</h2><p>Learn to recognize common problem shapes, choose a technique, and practice with problems already in your roadmap.</p></div>
      <div className="pattern-overall-stat"><strong>{solvedUniqueCount}<span> / {allUniqueProblems.size}</span></strong><small>distinct linked problems solved</small></div>
    </header>

    <div className="pattern-workspace">
      <aside className="pattern-index" aria-label="DSA patterns">
        <label className="pattern-search"><Search size={16} aria-hidden="true" /><span className="visually-hidden">Search patterns</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patterns" /></label>
        {visiblePatterns.length ? <div className="pattern-index-list">{visiblePatterns.map((pattern) => {
          const done = pattern.problems.filter(({ subject, topic, problem }) => progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)).length;
          return <button type="button" key={pattern.id} className={`pattern-index-item${selected?.id === pattern.id ? " active" : ""}`} aria-pressed={selected?.id === pattern.id} onClick={() => setSelectedId(pattern.id)}>
            <span><strong>{pattern.name}</strong><small>{pattern.problems.length} {pattern.problems.length === 1 ? "problem" : "problems"}</small></span><span className="pattern-index-progress">{done}/{pattern.problems.length}</span>
          </button>;
        })}</div> : <div className="pattern-index-empty">No patterns match this search. Try a different technique name or clue.</div>}
        <Link className="pattern-roadmap-link" to="/subjects/dsa">Open DSA roadmap<ArrowRight size={14} /></Link>
      </aside>

      {selected ? <section className="pattern-detail" aria-label={`${selected.name} pattern guide`} key={selected.id}>
        <header className="pattern-detail-heading"><span className="eyebrow">Technique guide</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="pattern-progress-line"><span><Check size={15} />{solvedInPattern} of {selected.problems.length} distinct problems solved</span><span>{selected.problems.length} linked</span></div></header>
        <div className="pattern-learning-grid">
          <section className="pattern-learning-block pattern-when"><h3>When to consider it</h3><p>{selected.whenToConsider}</p></section>
          <section className="pattern-learning-block"><h3>Recognition clues</h3><ul>{selected.clues.map((clue) => <li key={clue}>{clue}</li>)}</ul></section>
          <section className="pattern-learning-block"><h3>Approach</h3><ol>{selected.approach.map((step) => <li key={step}>{step}</li>)}</ol></section>
          <section className="pattern-learning-block"><h3>Common mistakes</h3><ul>{selected.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></section>
          <section className="pattern-learning-block pattern-complexity"><h3>Complexity notes</h3><p>{selected.complexity}</p></section>
        </div>

        <section className="pattern-practice-section">
          <div className="pattern-practice-heading"><div><span className="eyebrow">Existing roadmap problems</span><h3>Practice this pattern</h3><p>Completion is shared with the original topic and Practice pages.</p></div><span className="pattern-problem-count">{filteredProblems.length} shown</span></div>
          <div className="pattern-filters">
            <label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="all">All difficulties</option>{[...new Set(selected.problems.map(({ problem }) => problem.difficulty).filter(Boolean))].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Completion<select value={completion} onChange={(event) => setCompletion(event.target.value)}><option value="all">All problems</option><option value="unsolved">Unsolved</option><option value="solved">Solved</option></select></label>
            {(search || difficulty !== "all" || completion !== "all") && <button className="pattern-clear-button" type="button" onClick={clearFilters}><RotateCcw size={14} />Clear filters</button>}
          </div>
          {filteredProblems.length ? <div className="pattern-problem-list">{filteredProblems.map(({ subject, topic, problem, key }) => <article className="pattern-problem-row" key={key}>
            <div className="pattern-problem-context"><BookOpen size={14} aria-hidden="true" /><Link to={`/subjects/${subject.id}/topics/${topic.id}#practice`}>{topic.title}</Link></div>
            <CodingProblem problem={problem} completed={progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)} onToggle={() => progressApi.toggleCodingProblem(subject.id, topic.id, problem.id)} saved={progressApi.isSaved("coding", subject.id, topic.id, problem.id)} onToggleSaved={() => progressApi.toggleSaved("coding", subject.id, topic.id, problem.id)} />
          </article>)}</div> : <div className="empty-state pattern-no-problems"><h3>{selected.problems.length ? "No problems match these filters" : "No linked problems yet"}</h3><p>{selected.problems.length ? "Adjust the difficulty or completion filters to see matching problems." : "This technique has guidance, but no suitable coding problems in the current catalog."}</p>{selected.problems.length > 0 && <button className="secondary-button" type="button" onClick={() => { setDifficulty("all"); setCompletion("all"); }}>Reset problem filters</button>}</div>}
        </section>
      </section> : <div className="empty-state pattern-no-selection"><h3>No pattern selected</h3><p>Search a different term to find a pattern guide.</p></div>}
    </div>
  </div>;
}
