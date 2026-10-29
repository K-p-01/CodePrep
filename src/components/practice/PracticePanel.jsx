import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CodingProblem from "./CodingProblem.jsx";
import MCQQuestion from "./MCQQuestion.jsx";
import PracticeFilters from "./PracticeFilters.jsx";
import PracticeProgress from "./PracticeProgress.jsx";
import { DEFAULT_PRACTICE_FILTERS, filterPracticeItems, getPracticeFilterOptions } from "./practiceUtils.js";

export default function PracticePanel({ subject, topic, practice, progressApi, filters: sharedFilters, onFiltersChange, filterOptions, filteredItems, showFilters = true, visibleFilters }) {
  const [localFilters, setLocalFilters] = useState(DEFAULT_PRACTICE_FILTERS);
  const isShared = Boolean(sharedFilters && onFiltersChange);
  const filters = isShared ? sharedFilters : localFilters;
  const setFilters = isShared ? onFiltersChange : setLocalFilters;
  useEffect(() => setLocalFilters(DEFAULT_PRACTICE_FILTERS), [subject.id, topic.id]);

  const options = filterOptions ?? getPracticeFilterOptions([{ subject, topic, practice }], progressApi);
  const items = useMemo(() => filteredItems ?? filterPracticeItems({ subject, topic, practice, filters, progressApi }), [filteredItems, subject, topic, practice, filters, progressApi]);
  const problems = items.problems;
  const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 };
  const sortedProblems = [...problems].sort((a, b) =>
    (difficultyOrder[a.difficulty] ?? 3) - (difficultyOrder[b.difficulty] ?? 3) || a.title.localeCompare(b.title),
  );
  const problemGroups = ["Easy", "Medium", "Hard", "Other"].map((difficulty) => ({
    difficulty,
    problems: sortedProblems.filter((problem) => (difficultyOrder[problem.difficulty] === undefined ? "Other" : problem.difficulty) === difficulty),
  })).filter((group) => group.problems.length);
  const questions = items.questions;
  const hasPractice = (practice?.problems?.length ?? 0) + (practice?.questions?.length ?? 0) > 0;
  const hasVisiblePractice = problems.length + questions.length > 0;
  const type = problems.length && questions.length ? "mixed" : problems.length ? "coding" : "mcq";
  const summary = progressApi.getPracticeSummary(subject.id, topic.id, { problems, questions });

  if (!hasPractice) return <div className="empty-state"><h3>No practice items in this topic yet</h3><p>This topic does not currently include coding problems or MCQs. Browse the roadmap to choose another topic with practice.</p><Link className="secondary-button" to={`/subjects/${subject.id}`}>Back to {subject.name} roadmap</Link></div>;

  return (
    <div className="practice-engine stack">
      <div className="practice-engine-head"><div><span className="eyebrow">{type === "mixed" ? "Coding and MCQ practice" : type === "coding" ? "Coding practice" : "MCQ practice"}</span><p>Progress is saved locally and shared with your topic progress.</p></div></div>
      <PracticeProgress type={type} summary={summary} />
      {showFilters && <PracticeFilters filters={filters} options={options} onChange={setFilters} visibleFilters={visibleFilters} />}
      {!hasVisiblePractice ? <div className="empty-state"><h3>No practice matches these filters</h3><p>Clear or adjust the filters to see available problems and questions.</p></div> : <>
        {problems.length > 0 && <section className="practice-mode-panel"><div className="practice-list-heading"><h3>Coding problems</h3><span>{summary.completedProblems} of {summary.totalProblems} solved</span></div><div className="difficulty-groups">{problemGroups.map((group) => <section key={group.difficulty} className="difficulty-group"><h4>{group.difficulty} <span>{group.problems.length}</span></h4><div className="coding-list">{group.problems.map((problem) => <CodingProblem key={problem.id} problem={problem} subjectId={subject.id} topicId={topic.id} completed={progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)} onToggle={() => progressApi.toggleCodingProblem(subject.id, topic.id, problem.id)} saved={progressApi.isSaved("coding", subject.id, topic.id, problem.id)} onToggleSaved={() => progressApi.toggleSaved("coding", subject.id, topic.id, problem.id)} />)}</div></section>)}</div></section>}
        {questions.length > 0 && <section className="practice-mode-panel"><h3>Multiple choice questions</h3><MCQQuestion key={`${subject.id}:${topic.id}:${questions.map((question) => question.id).join(",")}`} questions={questions} attempt={progressApi.getMcqAttempt(subject.id, topic.id)} onSubmitAnswer={(question, answer) => progressApi.answerMcqQuestion(subject.id, topic.id, question, answer, practice.questions.length)} onResetAttempt={() => progressApi.resetMcqAttempt(subject.id, topic.id)} subjectId={subject.id} topicId={topic.id} progressApi={progressApi} /></section>}
      </>}
    </div>
  );
}
