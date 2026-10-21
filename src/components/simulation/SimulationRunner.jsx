import { useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3, Eraser, Flag, Send } from "lucide-react";
import { simulationCodingKey, simulationQuestionKey } from "../../data/placementSimulation.js";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function safeHttpUrl(value) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export default function SimulationRunner({ attempt, questions, codingProblems, remainingSeconds, onQuestion, onAnswer, onClearAnswer, onToggleReview, onCodingAttempt, onPrevious, onNext, onSubmit }) {
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const index = Math.min(attempt.currentIndex, questions.length - 1);
  const current = questions[index];
  const currentKey = current ? simulationQuestionKey(current.ref) : null;
  const answer = currentKey ? attempt.answers[currentKey] : null;
  const reviewed = currentKey ? attempt.markedForReview[currentKey] === true : false;
  const answeredCount = questions.filter(({ ref, question }) => {
    const selected = attempt.answers[simulationQuestionKey(ref)];
    return question?.options?.includes(selected);
  }).length;
  const unanswered = questions.length - answeredCount;
  const isExpired = remainingSeconds <= 0;
  const minutesRemaining = Math.ceil(remainingSeconds / 60);

  return <div className="simulation-runner">
    <header className="simulation-runner-header"><div><span className="eyebrow">{attempt.config.focusLabel} · {attempt.config.durationMinutes} minute practice simulation</span><h2>Placement simulation</h2></div><div className={`simulation-timer${remainingSeconds <= 60 ? " urgent" : ""}`} aria-label={`${formatTime(remainingSeconds)} remaining`}><Clock3 size={18} /><span>{formatTime(remainingSeconds)}</span><small className="visually-hidden" role="status" aria-live="polite">{minutesRemaining} {minutesRemaining === 1 ? "minute" : "minutes"} remaining</small></div></header>
    <p className="simulation-practice-notice">Practice simulation · client-side and not proctored. MCQs are graded when submitted; coding tasks are self-reported and not graded here.</p>
    <div className="simulation-runner-grid">
      <aside className="simulation-question-nav"><div className="simulation-nav-heading"><strong>Questions</strong><span>{answeredCount}/{questions.length} answered</span></div><div className="simulation-number-grid">{questions.map(({ ref, question }, questionIndex) => {
        const key = simulationQuestionKey(ref);
        const isAnswered = Boolean(question && question.options?.includes(attempt.answers[key]));
        return <button type="button" key={key} onClick={() => onQuestion(questionIndex)} className={`simulation-number${questionIndex === index ? " current" : ""}${isAnswered ? " answered" : ""}${attempt.markedForReview[key] ? " flagged" : ""}${!question ? " unavailable" : ""}`} aria-current={questionIndex === index ? "step" : undefined} aria-label={`Question ${questionIndex + 1}${isAnswered ? ", answered" : ", unanswered"}${attempt.markedForReview[key] ? ", marked for review" : ""}${!question ? ", unavailable" : ""}`}>
          {questionIndex + 1}{attempt.markedForReview[key] && <span aria-hidden="true">•</span>}
        </button>;
      })}</div><div className="simulation-nav-legend"><span><i className="answered" />Answered</span><span><i className="flagged" />Review</span></div>
        <button type="button" className="simulation-submit-button" onClick={() => setConfirmSubmit(true)} disabled={isExpired}><Send size={15} />Submit simulation</button>
      </aside>

      <section className="simulation-question-panel" aria-labelledby="simulation-question-heading">
        {current?.question ? <>
          <div className="simulation-question-meta"><span>{current.subject?.name ?? current.ref.subjectId} · {current.topic?.title ?? current.ref.topicId}</span><span>{current.question.difficulty ?? "Practice"}</span></div>
          <div className="simulation-question-count">Question {index + 1} of {questions.length}</div>
          <h3 id="simulation-question-heading">{current.question.prompt}</h3>
          <div className="simulation-answer-options" role="group" aria-labelledby="simulation-question-heading">{current.question.options.map((option, optionIndex) => <button type="button" key={`${optionIndex}-${option}`} className={`simulation-answer-option${answer === option ? " selected" : ""}`} aria-pressed={answer === option} onClick={() => onAnswer(currentKey, option)}><span className="simulation-option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{answer === option && <Check size={16} />}</button>)}</div>
          <div className="simulation-question-actions"><button type="button" className={`simulation-review-button${reviewed ? " marked" : ""}`} onClick={() => onToggleReview(currentKey)} aria-pressed={reviewed}>{reviewed ? <Bookmark size={15} fill="currentColor" /> : <Flag size={15} />}{reviewed ? "Marked for review" : "Mark for review"}</button>{answer && <button type="button" className="simulation-clear-answer" onClick={() => onClearAnswer(currentKey)}><Eraser size={14} />Clear answer</button>}</div>
        </> : <div className="simulation-unavailable-question"><span className="eyebrow">Question unavailable</span><h3 id="simulation-question-heading">This question is no longer in the catalog.</h3><p>It will remain in the assessment denominator as unanswered. Continue to another question or submit.</p></div>}
        <div className="simulation-step-controls"><button className="secondary-button" type="button" onClick={onPrevious} disabled={index <= 0}><ArrowLeft size={15} />Previous</button><span>{index + 1} / {questions.length}</span><button className="secondary-button" type="button" onClick={onNext} disabled={index >= questions.length - 1}>Next<ArrowRight size={15} /></button></div>
      </section>
    </div>

    {codingProblems.length > 0 && <section className="simulation-coding-round"><div className="simulation-coding-heading"><div><span className="eyebrow">Optional DSA round</span><h3>External coding tasks</h3><p>These tasks are outside the MCQ score. Mark whether you attempted each one.</p></div><span>{codingProblems.filter(({ ref }) => attempt.codingAttempts[simulationCodingKey(ref)]).length}/{codingProblems.length} attempted</span></div>
      <div className="simulation-coding-list">{codingProblems.map(({ ref, topic, problem }) => { const key = simulationCodingKey(ref); const url = safeHttpUrl(problem?.url); const attempted = attempt.codingAttempts[key] === true; return <article key={key} className="simulation-coding-item"><div><strong>{problem?.title ?? "Coding problem unavailable"}</strong><small>{topic?.title ?? ref.topicId} · {problem?.difficulty ?? "—"} · {problem?.platform ?? "External site"}</small></div><div className="simulation-coding-actions">{url ? <a href={url} target="_blank" rel="noopener noreferrer">Open problem<ArrowRight size={13} /></a> : <span>Link unavailable</span>}<button type="button" className={attempted ? "attempted" : ""} aria-pressed={attempted} onClick={() => onCodingAttempt(key, !attempted)}>{attempted ? "Attempted" : "Not attempted"}</button></div></article>; })}</div>
    </section>}

    {confirmSubmit && <div className="simulation-dialog-backdrop"><section className="simulation-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="simulation-submit-heading"><span className="eyebrow">Finish assessment</span><h3 id="simulation-submit-heading">Submit this simulation?</h3><p>{unanswered ? `${unanswered} unanswered ${unanswered === 1 ? "question will" : "questions will"} count as incorrect in the total score.` : "All questions have an answer. Your result will be calculated now."}</p><div><button type="button" className="secondary-button" onClick={() => setConfirmSubmit(false)}>Keep working</button><button type="button" className="primary-button" onClick={() => { setConfirmSubmit(false); onSubmit("manual"); }}>Submit now</button></div></section></div>}
  </div>;
}
