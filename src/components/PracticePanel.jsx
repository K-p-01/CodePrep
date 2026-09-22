import { CheckSquare, HelpCircle } from "lucide-react";
import { useMemo, useState } from "react";
import CodingProblem from "./CodingProblem.jsx";
import MCQQuestion from "./MCQQuestion.jsx";
import PracticeFilters from "./PracticeFilters.jsx";
import PracticeProgress from "./PracticeProgress.jsx";

const emptyFilters = {
  type: "all",
  topic: "all",
  difficulty: "all",
};

function matchesFilters(item, type, filters) {
  return (
    (filters.type === "all" || filters.type === type) &&
    (filters.topic === "all" || item.topic === filters.topic) &&
    (filters.difficulty === "all" || item.difficulty === filters.difficulty)
  );
}

export default function PracticePanel({ subject, topic, practice, progressApi }) {
  const [filters, setFilters] = useState(emptyFilters);
  const problems = practice?.problems ?? [];
  const questions = practice?.questions ?? [];
  const practiceType = practice?.type ?? "coding";

  const options = useMemo(() => {
    const items = [
      ...problems.map((problem) => ({ ...problem, type: "coding" })),
      ...questions.map((question) => ({ ...question, type: "mcq" })),
    ];

    return {
      types: [...new Set(items.map((item) => item.type))],
      topics: [...new Set(items.map((item) => item.topic).filter(Boolean))],
      difficulties: [...new Set(items.map((item) => item.difficulty).filter(Boolean))],
    };
  }, [problems, questions]);

  const filteredProblems = problems.filter((problem) => matchesFilters(problem, "coding", filters));
  const filteredQuestions = questions.filter((question) => matchesFilters(question, "mcq", filters));
  const summary = progressApi.getPracticeSummary(subject.id, topic.id, practice);
  const attempt = progressApi.getMcqAttempt(subject.id, topic.id);

  function updateFilters(nextFilters) {
    setFilters((current) => ({ ...current, ...nextFilters }));
  }

  return (
    <div id="practice" className="practice-engine">
      <div className="practice-engine-head">
        <div>
          <span className="eyebrow">Reusable practice engine</span>
          <h3>{practiceType === "mcq" ? "MCQ Practice" : "Coding Practice"}</h3>
          <p>
            This panel chooses the right interface from practice data, so the same component works
            across DSA, DBMS, OS, CN, OOP, and future subjects.
          </p>
        </div>
        <PracticeProgress type={practiceType} summary={summary} />
      </div>

      <PracticeFilters filters={filters} options={options} onChange={updateFilters} />

      {practiceType === "coding" && (
        <section className="practice-mode-panel">
          <div className="section-title compact">
            <CheckSquare size={18} />
            <h3>Coding Problems</h3>
          </div>
          {filteredProblems.length ? (
            <div className="coding-list">
              {filteredProblems.map((problem) => (
                <CodingProblem
                  key={problem.id}
                  problem={problem}
                  completed={progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id)}
                  onToggle={() => progressApi.toggleCodingProblem(subject.id, topic.id, problem.id)}
                  bookmarked={progressApi.isBookmarked(`coding:${subject.id}:${topic.id}:${problem.id}`)}
                  onBookmark={() =>
                    progressApi.toggleBookmark({
                      id: `coding:${subject.id}:${topic.id}:${problem.id}`,
                      type: "Coding Problem",
                      title: problem.title,
                      subtitle: `${problem.platform} · ${problem.difficulty}`,
                      subjectId: subject.id,
                      subjectName: subject.name,
                      topicId: topic.id,
                      topicTitle: topic.title,
                      to: `/subjects/${subject.id}/topics/${topic.id}#practice`,
                      url: problem.url,
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <p className="muted">No coding problems match the selected filters.</p>
          )}
        </section>
      )}

      {practiceType === "mcq" && (
        <section className="practice-mode-panel">
          <div className="section-title compact">
            <HelpCircle size={18} />
            <h3>MCQ Attempt</h3>
          </div>
          <MCQQuestion
            questions={filteredQuestions}
            attempt={attempt}
            onSubmitAnswer={(question, selectedAnswer, totalQuestions) =>
              progressApi.answerMcqQuestion(subject.id, topic.id, question, selectedAnswer, totalQuestions)
            }
            onResetAttempt={() => progressApi.resetMcqAttempt(subject.id, topic.id)}
            isBookmarked={(questionId) => progressApi.isBookmarked(`mcq:${subject.id}:${topic.id}:${questionId}`)}
            onToggleBookmark={(question) =>
              progressApi.toggleBookmark({
                id: `mcq:${subject.id}:${topic.id}:${question.id}`,
                type: "MCQ",
                title: question.prompt,
                subtitle: `${topic.title} · ${question.difficulty}`,
                subjectId: subject.id,
                subjectName: subject.name,
                topicId: topic.id,
                topicTitle: topic.title,
                to: `/subjects/${subject.id}/topics/${topic.id}#practice`,
              })
            }
          />
        </section>
      )}
    </div>
  );
}

