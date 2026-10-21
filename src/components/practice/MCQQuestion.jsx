import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QuestionCard from "./QuestionCard.jsx";
import SaveButton from "../SaveButton.jsx";

export default function MCQQuestion({ questions = [], attempt = { answers: {} }, onSubmitAnswer, onResetAttempt, subjectId, topicId, progressApi }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState("");
  const answers = attempt.answers ?? {};
  const questionSetKey = useMemo(() => JSON.stringify(questions.map((question) => question.id)), [questions]);

  useEffect(() => setCurrentIndex(0), [questionSetKey]);

  if (!questions.length) return <div className="empty-state"><h3>No questions available for this topic</h3><p>Choose another topic from this subject roadmap to find available practice.</p><Link className="secondary-button" to={`/subjects/${subjectId}`}>Back to subject roadmap</Link></div>;

  const safeIndex = Math.min(currentIndex, questions.length - 1);
  const question = questions[safeIndex];
  const savedAnswer = answers[question.id];
  const saved = question.options?.includes(savedAnswer?.selectedAnswer) ? savedAnswer : null;
  const selectedAnswer = saved?.selectedAnswer ?? draftAnswer;
  const answeredCount = questions.filter((item) => item.options?.includes(answers[item.id]?.selectedAnswer)).length;
  const correctCount = questions.filter((item) => item.options?.includes(answers[item.id]?.selectedAnswer) && answers[item.id].selectedAnswer === item.correctAnswer).length;
  const complete = answeredCount === questions.length;
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const lastAnsweredQuestion = Object.keys(answers)
    .reverse()
    .map((id) => questions.find((item) => item.id === id))
    .find((item) => item && item.options?.includes(answers[item.id]?.selectedAnswer));

  function submit() {
    if (!selectedAnswer || saved) return;
    onSubmitAnswer(question, selectedAnswer, questions.length);
  }

  function moveNext() {
    const nextUnanswered = questions.findIndex((item, index) => index > safeIndex && !answers[item.id]);
    setDraftAnswer("");
    setCurrentIndex(nextUnanswered >= 0 ? nextUnanswered : Math.min(safeIndex + 1, questions.length - 1));
  }

  function retryAttempt() {
    setCurrentIndex(0);
    setDraftAnswer("");
    onResetAttempt();
  }

  if (complete) return <QuestionCard><div className="mcq-complete" role="status">
    <span className="eyebrow">Attempt complete</span><h3>Practice summary</h3>
    {lastAnsweredQuestion && <div className={`answer-feedback ${answers[lastAnsweredQuestion.id].selectedAnswer === lastAnsweredQuestion.correctAnswer ? "correct" : "incorrect"}`}><strong>{answers[lastAnsweredQuestion.id].selectedAnswer === lastAnsweredQuestion.correctAnswer ? "Correct answer" : "Incorrect answer"} · {lastAnsweredQuestion.prompt}</strong><p>{lastAnsweredQuestion.explanation}</p></div>}
    <div className="mcq-final-stats"><span><strong>{answeredCount}</strong> answered</span><span><strong>{correctCount}</strong> correct</span><span><strong>{accuracy}%</strong> accuracy</span></div>
    <p>Accuracy is calculated from submitted answers; unanswered questions are excluded.</p>
    <button type="button" className="secondary-button" onClick={retryAttempt}><RotateCcw size={16} /> Retry MCQs</button>
  </div></QuestionCard>;

  return <QuestionCard>
    <div className="mcq-header"><span aria-live="polite" aria-atomic="true">Question {safeIndex + 1} of {questions.length}</span><span className={`difficulty-badge ${(question.difficulty ?? "").toLowerCase()}`}>{question.difficulty ?? "Practice"}</span></div>
    <h3 id={`question-${question.id}`}>{question.prompt}</h3>
    {progressApi && subjectId && topicId && <div className="mcq-save-action"><SaveButton saved={progressApi.isSaved("mcq", subjectId, topicId, question.id)} onToggle={() => progressApi.toggleSaved("mcq", subjectId, topicId, question.id)} itemLabel={question.prompt} /></div>}
    <div className="mcq-options" role="group" aria-labelledby={`question-${question.id}`}>{(question.options ?? []).map((option) => {
      const selected = selectedAnswer === option;
      const correct = Boolean(saved) && option === question.correctAnswer;
      const incorrect = Boolean(saved) && selected && option !== question.correctAnswer;
      return <button key={option} type="button" className={["mcq-option", selected ? "selected" : "", correct ? "correct" : "", incorrect ? "incorrect" : ""].filter(Boolean).join(" ")} aria-pressed={selected} disabled={Boolean(saved)} onClick={() => setDraftAnswer(option)}>{option}</button>;
    })}</div>
    {!saved && <div className="mcq-actions"><button type="button" className="primary-button" disabled={!selectedAnswer} onClick={submit}>Submit answer</button></div>}
    {saved && <><div className={saved.selectedAnswer === question.correctAnswer ? "answer-feedback correct" : "answer-feedback incorrect"} role="status" aria-live="polite"><strong>{saved.selectedAnswer === question.correctAnswer ? "Correct answer" : "Incorrect answer"}</strong><p>{question.explanation}</p></div>
      <div className="mcq-actions"><button type="button" className="secondary-button" onClick={() => { setDraftAnswer(""); setCurrentIndex(Math.max(0, safeIndex - 1)); }} disabled={safeIndex === 0}>Previous</button><button type="button" className="primary-button" onClick={moveNext}>Next question</button></div>
    </>}
  </QuestionCard>;
}
