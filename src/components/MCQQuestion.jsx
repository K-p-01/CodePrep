import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QuestionCard from "./QuestionCard.jsx";
import BookmarkButton from "./BookmarkButton.jsx";

export default function MCQQuestion({
  questions,
  attempt,
  onSubmitAnswer,
  onResetAttempt,
  isBookmarked,
  onToggleBookmark,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const answeredCount = questions.filter((question) => attempt.answers?.[question.id]).length;
  const currentScore = questions.filter((question) => attempt.answers?.[question.id]?.correct).length;
  const complete = questions.length > 0 && answeredCount >= questions.length;
  const currentQuestion = questions[currentIndex];
  const savedAnswer = currentQuestion ? attempt.answers?.[currentQuestion.id] : null;

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedAnswer("");
  }, [questions]);

  useEffect(() => {
    setSelectedAnswer(savedAnswer?.selectedAnswer ?? "");
  }, [savedAnswer, currentQuestion?.id]);

  const resultText = useMemo(() => {
    if (!savedAnswer) return "";
    return savedAnswer.correct ? "Correct answer" : "Incorrect answer";
  }, [savedAnswer]);

  if (!questions.length) {
    return <p className="muted">No MCQs match the selected filters.</p>;
  }

  if (complete) {
    return (
      <QuestionCard>
        <div className="mcq-complete">
          <span className="eyebrow">Attempt complete</span>
          <h3>
            Score: {currentScore}/{questions.length}
          </h3>
          <p>You have answered all questions in this filtered set.</p>
          <button type="button" className="secondary-button" onClick={onResetAttempt}>
            <RotateCcw size={16} />
            Retry MCQs
          </button>
        </div>
      </QuestionCard>
    );
  }

  function handleSubmit() {
    if (!selectedAnswer || savedAnswer) return;
    onSubmitAnswer(currentQuestion, selectedAnswer, questions.length);
  }

  function goNext() {
    const nextUnansweredIndex = questions.findIndex(
      (question, index) => index > currentIndex && !attempt.answers?.[question.id],
    );
    setCurrentIndex(
      nextUnansweredIndex === -1 ? Math.min(currentIndex + 1, questions.length - 1) : nextUnansweredIndex,
    );
  }

  return (
    <QuestionCard>
      <div className="mcq-header">
        <span>
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="mcq-header-actions">
          <span className={`difficulty-badge ${currentQuestion.difficulty.toLowerCase()}`}>
            {currentQuestion.difficulty}
          </span>
          {isBookmarked && onToggleBookmark ? (
            <BookmarkButton
              label="Save"
              bookmarked={isBookmarked(currentQuestion.id)}
              onToggle={() => onToggleBookmark(currentQuestion)}
            />
          ) : null}
        </div>
      </div>

      <h3>{currentQuestion.prompt}</h3>

      <div className="mcq-options">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = savedAnswer && option === currentQuestion.correctAnswer;
          const isWrongSelection = savedAnswer && isSelected && !savedAnswer.correct;
          return (
            <button
              key={option}
              type="button"
              className={[
                "mcq-option",
                isSelected ? "selected" : "",
                isCorrect ? "correct" : "",
                isWrongSelection ? "incorrect" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => !savedAnswer && setSelectedAnswer(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {savedAnswer && (
        <div className={savedAnswer.correct ? "answer-feedback correct" : "answer-feedback incorrect"}>
          <strong>{resultText}</strong>
          <p>{currentQuestion.explanation}</p>
        </div>
      )}

      <div className="mcq-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleSubmit}
          disabled={!selectedAnswer || Boolean(savedAnswer)}
        >
          Submit
        </button>
        <button type="button" className="secondary-button" onClick={goNext} disabled={!savedAnswer}>
          Next Question
        </button>
      </div>
    </QuestionCard>
  );
}

