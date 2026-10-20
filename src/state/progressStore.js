import { useEffect, useMemo, useState } from "react";
import { subjects } from "../data/subjects.js";

const STORAGE_KEY = "codeprep-progress-v1";
const STATUS_LABELS = {
  completed: "Completed",
  inProgress: "In Progress",
  notStarted: "Not Started",
  locked: "Locked / Upcoming",
};

function readProgress() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeProgress(progress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useProgress() {
  const [progress, setProgress] = useState(readProgress);

  useEffect(() => {
    writeProgress(progress);
  }, [progress]);

  function toggleTopic(subjectId, topicId) {
    const key = `${subjectId}:${topicId}`;
    setProgress((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function isTopicComplete(subjectId, topicId) {
    return Boolean(progress[`${subjectId}:${topicId}`]);
  }

  function codingProblemKey(subjectId, topicId, problemId) {
    return `coding:${subjectId}:${topicId}:${problemId}`;
  }

  function mcqAttemptKey(subjectId, topicId) {
    return `mcq:${subjectId}:${topicId}`;
  }

  function toggleCodingProblem(subjectId, topicId, problemId) {
    const key = codingProblemKey(subjectId, topicId, problemId);
    setProgress((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function isCodingProblemComplete(subjectId, topicId, problemId) {
    return Boolean(progress[codingProblemKey(subjectId, topicId, problemId)]);
  }

  function getMcqAttempt(subjectId, topicId) {
    const attempt = progress[mcqAttemptKey(subjectId, topicId)];
    return attempt && typeof attempt === "object" ? attempt : { answers: {}, score: 0, completed: false };
  }

  function answerMcqQuestion(subjectId, topicId, question, selectedAnswer, totalQuestions) {
    const key = mcqAttemptKey(subjectId, topicId);
    setProgress((current) => {
      const currentAttempt =
        current[key] && typeof current[key] === "object"
          ? current[key]
          : { answers: {}, score: 0, completed: false };

      const answers = {
        ...currentAttempt.answers,
        [question.id]: {
          selectedAnswer,
          correct: selectedAnswer === question.correctAnswer,
        },
      };

      const score = Object.values(answers).filter((answer) => answer.correct).length;
      const completed = Object.keys(answers).length >= totalQuestions;

      return {
        ...current,
        [key]: {
          answers,
          score,
          completed,
        },
      };
    });
  }

  function resetMcqAttempt(subjectId, topicId) {
    const key = mcqAttemptKey(subjectId, topicId);
    setProgress((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function getPracticeSummary(subjectId, topicId, practice) {
    const problems = practice?.problems ?? [];
    const questions = practice?.questions ?? [];
    const completedProblems = problems.filter((problem) =>
      isCodingProblemComplete(subjectId, topicId, problem.id),
    ).length;
    const attempt = getMcqAttempt(subjectId, topicId);
    const answeredQuestions = Object.keys(attempt.answers ?? {}).length;

    return {
      completedProblems,
      totalProblems: problems.length,
      answeredQuestions,
      totalQuestions: questions.length,
      score: attempt.score ?? 0,
      completed:
        (problems.length === 0 || completedProblems === problems.length) &&
        (questions.length === 0 || attempt.completed) &&
        (problems.length > 0 || questions.length > 0),
    };
  }

  function getTopicProgress(subjectId, topic) {
    const practiceSummary = getPracticeSummary(subjectId, topic.id, topic.practice);
    const practiceTotal = practiceSummary.totalProblems + practiceSummary.totalQuestions;
    const practiceCompleted = practiceSummary.completedProblems + practiceSummary.answeredQuestions;
    const practicePercent = practiceTotal ? Math.round((practiceCompleted / practiceTotal) * 100) : 0;
    const complete = isTopicComplete(subjectId, topic.id);

    return {
      percent: complete ? 100 : practicePercent,
      complete,
      practiceCompleted,
      practiceTotal,
      completedProblems: practiceSummary.completedProblems,
      totalProblems: practiceSummary.totalProblems,
      answeredQuestions: practiceSummary.answeredQuestions,
      totalQuestions: practiceSummary.totalQuestions,
      score: practiceSummary.score,
    };
  }

  function getSubjectProgress(subject) {
    if (!subject.topics.length) {
      return {
        percent: 0,
        completedTopics: 0,
        startedTopics: 0,
        totalTopics: 0,
      };
    }

    const topicProgress = subject.topics.map((topic) => getTopicProgress(subject.id, topic));
    const totalPercent = topicProgress.reduce((total, item) => total + item.percent, 0);

    return {
      percent: Math.round(totalPercent / subject.topics.length),
      completedTopics: topicProgress.filter((item) => item.complete).length,
      startedTopics: topicProgress.filter((item) => item.percent > 0).length,
      totalTopics: subject.topics.length,
    };
  }

  function getTopicStatus(subject, topic) {
    const topicIndex = subject.topics.findIndex((item) => item.id === topic.id);
    const progressDetails = getTopicProgress(subject.id, topic);

    if (progressDetails.complete) {
      return { id: "completed", label: STATUS_LABELS.completed };
    }

    if (progressDetails.percent > 0) {
      return { id: "inProgress", label: STATUS_LABELS.inProgress };
    }

    const firstOpenIndex = subject.topics.findIndex((item) => !isTopicComplete(subject.id, item.id));
    const availableThroughIndex = firstOpenIndex === -1 ? subject.topics.length - 1 : firstOpenIndex + 1;

    if (topicIndex > availableThroughIndex) {
      return { id: "locked", label: STATUS_LABELS.locked };
    }

    return { id: "notStarted", label: STATUS_LABELS.notStarted };
  }

  function getContinueLearning() {
    for (const subject of subjects) {
      const inProgressTopic = subject.topics.find((topic) => getTopicStatus(subject, topic).id === "inProgress");
      if (inProgressTopic) {
        return { subject, topic: inProgressTopic, reason: "Continue your current topic" };
      }

      const nextTopic = subject.topics.find((topic) => getTopicStatus(subject, topic).id === "notStarted");
      if (nextTopic) {
        return { subject, topic: nextTopic, reason: "Next recommended topic" };
      }
    }

    const subject = subjects.find((item) => item.topics.length);
    return subject ? { subject, topic: subject.topics[0], reason: "Review completed roadmap" } : null;
  }

  function getStudySummary() {
    const subjectProgress = subjects.map((subject) => getSubjectProgress(subject));
    const totalTopics = subjectProgress.reduce((total, item) => total + item.totalTopics, 0);
    const completedTopics = subjectProgress.reduce((total, item) => total + item.completedTopics, 0);
    const totalPercent = subjects.reduce((total, subject) => total + getSubjectProgress(subject).percent, 0);
    const subjectsWithTopics = subjects.filter((subject) => subject.topics.length).length;
    const subjectsStarted = subjectProgress.filter((item) => item.startedTopics > 0).length;
    const practiceCompleted = subjects.reduce(
      (subjectTotal, subject) =>
        subjectTotal +
        subject.topics.reduce((topicTotal, topic) => {
          const topicProgress = getTopicProgress(subject.id, topic);
          return topicTotal + topicProgress.practiceCompleted;
        }, 0),
      0,
    );

    return {
      overallPercent: subjectsWithTopics ? Math.round(totalPercent / subjectsWithTopics) : 0,
      subjectsStarted,
      completedTopics,
      totalTopics,
      practiceCompleted,
    };
  }

  const summary = useMemo(() => {
    const studySummary = getStudySummary();

    return {
      totalTopics: studySummary.totalTopics,
      completedTopics: studySummary.completedTopics,
      percent: studySummary.overallPercent,
      subjectsStarted: studySummary.subjectsStarted,
      practiceCompleted: studySummary.practiceCompleted,
    };
  }, [progress]);

  return {
    progress,
    summary,
    toggleTopic,
    isTopicComplete,
    toggleCodingProblem,
    isCodingProblemComplete,
    getMcqAttempt,
    answerMcqQuestion,
    resetMcqAttempt,
    getPracticeSummary,
    getTopicProgress,
    getSubjectProgress,
    getTopicStatus,
    getContinueLearning,
    getStudySummary,
  };
}
