import { useEffect, useMemo, useRef, useState } from "react";
import { subjects } from "../data/subjects.js";
import { calculateRevisionSchedule, localDateKey, revisionItemKey } from "../data/revisionQueue.js";
import { recordSimulationSubmission, SIMULATION_DURATIONS } from "../data/placementSimulation.js";
import { appendActivityEvent, createActivityEvent, normalizeActivityEvent } from "../data/activityHistory.js";
import { resolveMissionTask } from "../components/dashboard/dailyMission.js";
import {
  appendCodingAttempt as appendCodingAttemptRecord,
  createCodingAttempt,
  getCodingPracticeRecord,
  saveCodingNotes as saveCodingNotesRecord,
} from "../data/codingPractice.js";

const STORAGE_KEY = "codeprep-progress-v1";
const STATUS_LABELS = {
  completed: "Completed",
  inProgress: "In Progress",
  notStarted: "Not Started",
};

let latestStorageNotice = "";

function setStorageNotice(message) {
  latestStorageNotice = message;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("codeprep:storage-notice", { detail: message }));
  }
}

export function getProgressStorageNotice() {
  return latestStorageNotice;
}

function normalizeSavedItems(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.filter((item) => {
    if (!item || !["topic", "resource", "coding", "mcq"].includes(item.type) ||
      typeof item.subjectId !== "string" || !item.subjectId || typeof item.topicId !== "string" || !item.topicId || typeof item.itemId !== "string" || !item.itemId) return false;
    const key = `${item.type}:${item.subjectId}:${item.topicId}:${item.itemId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(({ type, subjectId, topicId, itemId }) => ({ type, subjectId, topicId, itemId }));
}

function readProgress() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const notice = "Saved progress has an unexpected format. The stored data was left untouched; changes may not persist until it is repaired.";
      latestStorageNotice = notice;
      return { progress: {}, notice, writeAllowed: false };
    }
    const savedItems = normalizeSavedItems(parsed.savedItems);
    const savedItemsChanged = parsed.savedItems !== undefined && JSON.stringify(savedItems) !== JSON.stringify(parsed.savedItems);
    const notice = savedItemsChanged
      ? "Some saved progress entries could not be read. The stored data was left untouched; changes may not persist until it is repaired."
      : "";
    latestStorageNotice = notice;
    return { progress: { ...parsed, savedItems }, notice, writeAllowed: !notice };
  } catch {
    const notice = "Saved progress could not be read from this browser. The stored data was left untouched; changes may not persist.";
    latestStorageNotice = notice;
    return { progress: {}, notice, writeAllowed: false };
  }
}

function writeProgress(progress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function withActivityEvent(progress, event) {
  if (!event) return progress;
  const eventDate = new Date(event.timestamp);
  const next = appendActivityEvent(progress, event, eventDate);
  if (next === progress) return progress;
  const history = progress.activityHistory;
  const malformedHistory = history !== undefined && (!Array.isArray(history) || history.some((entry) => !normalizeActivityEvent(entry)));
  if (malformedHistory) next.activityHistoryMalformedBackup = history;
  return next;
}

function isMissionComplete(progress) {
  const mission = progress?.dailyMission;
  if (!mission || !Array.isArray(mission.tasks) || mission.tasks.length === 0) return false;
  const completedTaskIds = Array.isArray(mission.completedTaskIds) ? mission.completedTaskIds : [];
  return mission.tasks.every((task) => {
    const resolved = resolveMissionTask(task, subjects);
    if (!resolved.available) return false;
    if (completedTaskIds.includes(task.id)) return true;
    if (task.type !== "practice") return false;
    if (task.targetType === "coding") return progress[`coding:${task.subjectId}:${task.topicId}:${task.targetId}`] === true;
    if (task.targetType !== "mcq") return false;
    const questions = [...new Map((Array.isArray(resolved.topic.practice?.questions) ? resolved.topic.practice.questions : [])
      .filter((question) => typeof question?.id === "string" && question.id)
      .map((question) => [question.id, question])).values()];
    if (!questions.length) return false;
    const attempt = progress[`mcq:${task.subjectId}:${task.topicId}`];
    const answers = attempt?.answers && typeof attempt.answers === "object" && !Array.isArray(attempt.answers) ? attempt.answers : {};
    return questions.every((question) => typeof answers[question.id]?.selectedAnswer === "string" && question.options?.includes(answers[question.id].selectedAnswer));
  });
}

export function useProgress() {
  const [initial] = useState(readProgress);
  const [progress, setProgress] = useState(initial.progress);
  const [storageNotice, setStorageNoticeState] = useState(initial.notice);
  const firstWrite = useRef(true);

  useEffect(() => {
    if (firstWrite.current) {
      firstWrite.current = false;
      if (!initial.writeAllowed) return;
    }
    if (!initial.writeAllowed) return;
    try {
      writeProgress(progress);
      if (storageNotice) {
        setStorageNotice("");
        setStorageNoticeState("");
      }
    } catch {
      const notice = "Progress changed for this session but could not be saved in this browser. Check local storage availability.";
      setStorageNotice(notice);
      setStorageNoticeState(notice);
    }
  }, [initial.writeAllowed, progress, storageNotice]);

  function toggleTopic(subjectId, topicId) {
    const key = `${subjectId}:${topicId}`;
    const activity = createActivityEvent("topic_completed", { subjectId, topicId });
    setProgress((current) => {
      if (current[key] === true) return { ...current, [key]: false };
      return withActivityEvent({ ...current, [key]: true }, activity);
    });
  }

  function isTopicComplete(subjectId, topicId) {
    return progress[`${subjectId}:${topicId}`] === true;
  }

  function codingProblemKey(subjectId, topicId, problemId) {
    return `coding:${subjectId}:${topicId}:${problemId}`;
  }

  function mcqAttemptKey(subjectId, topicId) {
    return `mcq:${subjectId}:${topicId}`;
  }

  function toggleCodingProblem(subjectId, topicId, problemId) {
    const key = codingProblemKey(subjectId, topicId, problemId);
    const activity = createActivityEvent("coding_problem_completed", { subjectId, topicId, problemId });
    const missionActivity = progress.dailyMission?.date
      ? createActivityEvent("daily_mission_completed", { date: progress.dailyMission.date })
      : null;
    setProgress((current) => {
      if (current[key] === true) return { ...current, [key]: false };
      let next = withActivityEvent({ ...current, [key]: true }, activity);
      if (!isMissionComplete(current) && isMissionComplete(next) && missionActivity?.date === next.dailyMission?.date) {
        next = withActivityEvent(next, missionActivity);
      }
      return next;
    });
  }

  function isCodingProblemComplete(subjectId, topicId, problemId) {
    return progress[codingProblemKey(subjectId, topicId, problemId)] === true;
  }

  function getCodingPractice(subjectId, topicId, problemId) {
    return getCodingPracticeRecord(progress, subjectId, topicId, problemId);
  }

  function saveCodingPracticeNotes(subjectId, topicId, problemId, notes) {
    const updatedAt = new Date().toISOString();
    setProgress((current) => saveCodingNotesRecord(current, subjectId, topicId, problemId, notes, updatedAt));
  }

  function recordCodingAttempt(subjectId, topicId, problemId, attemptInput) {
    const attempt = createCodingAttempt(attemptInput);
    if (!attempt) return;
    const activity = createActivityEvent("coding_attempt_recorded", {
      subjectId, topicId, problemId, outcome: attempt.outcome,
    }, new Date(attempt.timestamp), `coding-attempt:${attempt.id}`);
    setProgress((current) => {
      const next = appendCodingAttemptRecord(current, subjectId, topicId, problemId, attempt);
      return next === current ? current : withActivityEvent(next, activity);
    });
  }

  function getMcqAttempt(subjectId, topicId) {
    const attempt = progress[mcqAttemptKey(subjectId, topicId)];
    if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) {
      return { answers: {}, score: 0, completed: false };
    }

    const answers = attempt.answers && typeof attempt.answers === "object" && !Array.isArray(attempt.answers)
      ? attempt.answers
      : {};

    const validAnswers = Object.fromEntries(Object.entries(answers).filter(([, answer]) => typeof answer?.selectedAnswer === "string"));
    return {
      ...attempt,
      answers: validAnswers,
      score: Object.values(validAnswers).filter((answer) => answer?.correct === true).length,
      completed: Boolean(attempt.completed),
    };
  }

  function answerMcqQuestion(subjectId, topicId, question, selectedAnswer, totalQuestions) {
    const key = mcqAttemptKey(subjectId, topicId);
    const activity = typeof question?.id === "string" && Array.isArray(question.options) && question.options.includes(selectedAnswer) &&
      typeof question.correctAnswer === "string" && question.options.includes(question.correctAnswer)
      ? createActivityEvent("mcq_answered", { subjectId, topicId, questionId: question.id, correct: selectedAnswer === question.correctAnswer })
      : null;
    const missionActivity = progress.dailyMission?.date
      ? createActivityEvent("daily_mission_completed", { date: progress.dailyMission.date })
      : null;
    setProgress((current) => {
      const currentAttempt =
        current[key] && typeof current[key] === "object"
          ? current[key]
          : { answers: {}, score: 0, completed: false };
      const currentAnswers =
        currentAttempt.answers && typeof currentAttempt.answers === "object" && !Array.isArray(currentAttempt.answers)
          ? currentAttempt.answers
          : {};
      const existingAnswers = Object.fromEntries(Object.entries(currentAnswers).filter(([, answer]) => typeof answer?.selectedAnswer === "string"));

      if (
        existingAnswers[question.id] ||
        typeof question?.id !== "string" ||
        !Array.isArray(question.options) ||
        !question.options.includes(selectedAnswer)
      ) {
        return current;
      }

      const answers = {
        ...existingAnswers,
        [question.id]: {
          selectedAnswer,
          correct: selectedAnswer === question.correctAnswer,
        },
      };

      const score = Object.values(answers).filter((answer) => answer.correct).length;
      const completed = Object.keys(answers).length >= totalQuestions;

      const next = {
        ...current,
        [key]: {
          answers,
          score,
          completed,
        },
      };
      let updated = withActivityEvent(next, activity);
      if (!isMissionComplete(current) && isMissionComplete(updated) && missionActivity?.date === updated.dailyMission?.date) {
        updated = withActivityEvent(updated, missionActivity);
      }
      return updated;
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
    const uniqueById = (items) => [...new Map((Array.isArray(items) ? items : [])
      .filter((item) => typeof item?.id === "string" && item.id)
      .map((item) => [item.id, item])).values()];
    const problems = uniqueById(practice?.problems);
    const questions = uniqueById(practice?.questions);
    const completedProblems = problems.filter((problem) =>
      isCodingProblemComplete(subjectId, topicId, problem.id),
    ).length;
    const attempt = getMcqAttempt(subjectId, topicId);
    const answeredQuestionRecords = questions
      .map((question) => ({
        question,
        answer: attempt.answers[question.id],
      }))
      .filter(({ question, answer }) => typeof answer?.selectedAnswer === "string" && question.options?.includes(answer.selectedAnswer));
    const answeredQuestions = answeredQuestionRecords.length;
    const correctAnswers = answeredQuestionRecords.filter(
      ({ question, answer }) => answer.selectedAnswer === question.correctAnswer,
    ).length;

    return {
      completedProblems,
      totalProblems: problems.length,
      answeredQuestions,
      totalQuestions: questions.length,
      score: correctAnswers,
      correctAnswers,
      accuracy: answeredQuestions ? Math.round((correctAnswers / answeredQuestions) * 100) : null,
      remainingQuestions: Math.max(0, questions.length - answeredQuestions),
      completed:
        (problems.length === 0 || completedProblems === problems.length) &&
        (questions.length === 0 || answeredQuestions >= questions.length) &&
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
      percent: complete ? 100 : 0,
      practicePercent,
      complete,
      hasActivity: practiceSummary.completedProblems > 0 || practiceSummary.answeredQuestions > 0,
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
    const topics = [...new Map((Array.isArray(subject.topics) ? subject.topics : [])
      .filter((topic) => typeof topic?.id === "string" && topic.id)
      .map((topic) => [topic.id, topic])).values()];
    if (!topics.length) {
      return {
        percent: 0,
        completedTopics: 0,
        startedTopics: 0,
        totalTopics: 0,
      };
    }

    const topicProgress = topics.map((topic) => getTopicProgress(subject.id, topic));
    const completedTopics = topicProgress.filter((item) => item.complete).length;

    return {
      percent: Math.round((completedTopics / topics.length) * 100),
      completedTopics,
      startedTopics: topicProgress.filter((item) => !item.complete && item.hasActivity).length,
      totalTopics: topics.length,
    };
  }

  function getTopicStatus(subject, topic) {
    const progressDetails = getTopicProgress(subject.id, topic);

    if (progressDetails.complete) {
      return { id: "completed", label: STATUS_LABELS.completed };
    }

    if (progressDetails.hasActivity) {
      return { id: "inProgress", label: STATUS_LABELS.inProgress };
    }

    return { id: "notStarted", label: STATUS_LABELS.notStarted };
  }

  function getContinueLearning(subjectIds = null) {
    const allowedSubjectIds = Array.isArray(subjectIds) ? new Set(subjectIds) : null;
    const topics = subjects.filter((subject) => !allowedSubjectIds || allowedSubjectIds.has(subject.id)).flatMap((subject) =>
      (Array.isArray(subject.topics) ? subject.topics : [])
        .filter((topic) => typeof subject.id === "string" && typeof topic?.id === "string" && topic.id)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
        .map((topic) => ({ subject, topic, status: getTopicStatus(subject, topic).id })),
    );
    const inProgress = topics.find((item) => item.status === "inProgress");
    if (inProgress) return { subject: inProgress.subject, topic: inProgress.topic, reason: "Continue your current topic" };
    const next = topics.find((item) => item.status !== "completed");
    if (next) return { subject: next.subject, topic: next.topic, reason: "Next recommended topic" };
    return topics.length ? { complete: true, reason: "You have completed every topic." } : null;
  }

  function setDailyMission(mission) {
    if (!mission || typeof mission.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(mission.date) || !Array.isArray(mission.tasks)) return;
    const tasks = mission.tasks.filter((task) => task && typeof task.id === "string" && task.id &&
      ["learn", "practice", "revise"].includes(task.type) && typeof task.subjectId === "string" &&
      typeof task.topicId === "string" && typeof task.targetType === "string")
      .map((task) => ({
        id: task.id,
        type: task.type,
        targetType: task.targetType,
        subjectId: task.subjectId,
        topicId: task.topicId,
        ...(typeof task.targetId === "string" ? { targetId: task.targetId } : {}),
      }));
    const seen = new Set();
    const uniqueTasks = tasks.filter((task) => !seen.has(task.id) && seen.add(task.id));
    const completedTaskIds = [...new Set((Array.isArray(mission.completedTaskIds) ? mission.completedTaskIds : [])
      .filter((id) => typeof id === "string" && uniqueTasks.some((task) => task.id === id)))];
    const dailyMission = {
      date: mission.date,
      duration: [20, 45, 60, 120].includes(Number(mission.duration)) ? Number(mission.duration) : 45,
      focus: typeof mission.focus === "string" ? mission.focus : "balanced",
      tasks: uniqueTasks,
      completedTaskIds,
    };
    setProgress((current) => ({ ...current, dailyMission }));
  }

  function completeDailyMissionTask(date, taskId) {
    if (typeof date !== "string" || typeof taskId !== "string" || !taskId) return;
    const activity = createActivityEvent("daily_mission_completed", { date });
    setProgress((current) => {
      const mission = current.dailyMission;
      if (!mission || mission.date !== date || !Array.isArray(mission.tasks) || !mission.tasks.some((task) => task.id === taskId)) return current;
      const completedTaskIds = Array.isArray(mission.completedTaskIds) ? mission.completedTaskIds : [];
      if (completedTaskIds.includes(taskId)) return current;
      const next = { ...current, dailyMission: { ...mission, completedTaskIds: [...completedTaskIds, taskId] } };
      return !isMissionComplete(current) && isMissionComplete(next) ? withActivityEvent(next, activity) : next;
    });
  }

  function isSaved(type, subjectId, topicId, itemId = topicId) {
    return normalizeSavedItems(progress.savedItems).some((item) =>
      item?.type === type && item.subjectId === subjectId && item.topicId === topicId && item.itemId === itemId,
    );
  }

  function toggleSaved(type, subjectId, topicId, itemId = topicId) {
    if (!new Set(["topic", "resource", "coding", "mcq"]).has(type) || !subjectId || !topicId || !itemId) return;
    const key = `${type}:${subjectId}:${topicId}:${itemId}`;
    setProgress((current) => {
      const savedItems = normalizeSavedItems(current.savedItems);
      const alreadySaved = savedItems.some((item) => `${item?.type}:${item?.subjectId}:${item?.topicId}:${item?.itemId}` === key);
      return { ...current, savedItems: alreadySaved
        ? savedItems.filter((item) => `${item?.type}:${item?.subjectId}:${item?.topicId}:${item?.itemId}` !== key)
        : [...savedItems, { type, subjectId, topicId, itemId }] };
    });
  }

  function removeSaved(savedItem) {
    setProgress((current) => ({
      ...current,
      savedItems: normalizeSavedItems(current.savedItems).filter((item) =>
        !(item?.type === savedItem.type && item.subjectId === savedItem.subjectId && item.topicId === savedItem.topicId && item.itemId === savedItem.itemId),
      ),
    }));
  }

  function recordRevisionOutcome(item, outcome) {
    if (!item || !["topic", "resource", "coding", "mcq"].includes(item.type) ||
        ![item.subjectId, item.topicId, item.itemId].every((value) => typeof value === "string" && value) ||
        !["again", "hard", "gotIt", "easy"].includes(outcome)) return;
    const key = revisionItemKey(item);
    const activity = createActivityEvent("revision_reviewed", { subjectId: item.subjectId, topicId: item.topicId, itemType: item.type });
    setProgress((current) => {
      const schedules = current.revisionSchedules && typeof current.revisionSchedules === "object" && !Array.isArray(current.revisionSchedules)
        ? current.revisionSchedules
        : {};
      const next = calculateRevisionSchedule(schedules[key], outcome, localDateKey());
      if (!next) return current;
      return withActivityEvent({
        ...current,
        ...(current.revisionSchedules !== undefined && schedules !== current.revisionSchedules
          ? { revisionSchedulesMalformedBackup: current.revisionSchedules }
          : {}),
        revisionSchedules: { ...schedules, [key]: next },
      }, activity);
    });
  }

  function updatePlacementSimulation(mutator) {
    setProgress((current) => {
      const existing = current.placementSimulation && typeof current.placementSimulation === "object" && !Array.isArray(current.placementSimulation)
        ? current.placementSimulation
        : {};
      const updated = mutator(existing);
      if (updated === existing) return current;
      return {
        ...current,
        ...(current.placementSimulation !== undefined && existing !== current.placementSimulation
          ? { placementSimulationMalformedBackup: current.placementSimulation }
          : {}),
        placementSimulation: updated,
      };
    });
  }

  function setPlacementSimulationConfig(config) {
    if (!config || typeof config.focusId !== "string" || !config.focusId || !SIMULATION_DURATIONS.includes(Number(config.durationMinutes)) ||
        !Number.isInteger(Number(config.questionCount)) || Number(config.questionCount) < 0) return;
    updatePlacementSimulation((existing) => ({ ...existing, config: {
      focusId: config.focusId,
      focusLabel: typeof config.focusLabel === "string" ? config.focusLabel : config.focusId,
      durationMinutes: Number(config.durationMinutes),
      questionCount: Number(config.questionCount),
      includeCodingRound: Boolean(config.includeCodingRound),
    } }));
  }

  function startPlacementSimulation(attempt, replaceActive = false) {
    if (!attempt || typeof attempt.id !== "string" || !Array.isArray(attempt.questionRefs) || !attempt.questionRefs.length) return;
    updatePlacementSimulation((existing) => {
      if (existing.activeAttempt && !replaceActive) return existing;
      return { ...existing, activeAttempt: attempt, config: attempt.config };
    });
  }

  function updateActivePlacementSimulation(attemptId, updater) {
    if (typeof attemptId !== "string" || typeof updater !== "function") return;
    updatePlacementSimulation((existing) => {
      const active = existing.activeAttempt;
      if (!active || active.id !== attemptId) return existing;
      const nextAttempt = updater(active);
      return nextAttempt === active ? existing : { ...existing, activeAttempt: nextAttempt };
    });
  }

  function submitPlacementSimulation(result) {
    if (!result || typeof result.id !== "string" || !result.result) return;
    const activity = createActivityEvent("simulation_submitted", { focusId: result.config?.focusId }, new Date(), `simulation:${result.id}`);
    setProgress((current) => {
      const existing = current.placementSimulation && typeof current.placementSimulation === "object" && !Array.isArray(current.placementSimulation)
        ? current.placementSimulation
        : {};
      const updated = recordSimulationSubmission(existing, result);
      if (updated === existing) return current;
      let next = {
        ...current,
        ...(current.placementSimulation !== undefined && existing !== current.placementSimulation
          ? { placementSimulationMalformedBackup: current.placementSimulation }
          : {}),
        placementSimulation: updated,
      };
      next = withActivityEvent(next, activity);
      return next;
    });
  }

  function discardActivePlacementSimulation(expectedId) {
    updatePlacementSimulation((existing) => {
      const active = existing.activeAttempt;
      if (expectedId === null) {
        if (!active || typeof active.id === "string") return existing;
      } else if (!active || active.id !== expectedId) return existing;
      return { ...existing, activeAttempt: null };
    });
  }

  function getStudySummary() {
    const subjectProgress = subjects.map((subject) => getSubjectProgress(subject));
    const totalTopics = subjectProgress.reduce((total, item) => total + item.totalTopics, 0);
    const completedTopics = subjectProgress.reduce((total, item) => total + item.completedTopics, 0);
    const subjectsStarted = subjectProgress.filter((item) => item.startedTopics > 0).length;
    const validTopics = subjects.flatMap((subject) => [...new Map((Array.isArray(subject.topics) ? subject.topics : [])
      .filter((topic) => typeof subject.id === "string" && subject.id && typeof topic?.id === "string" && topic.id)
      .map((topic) => [topic.id, topic])).values()].map((topic) => ({ subject, topic })));
    let totalCodingProblems = 0;
    let completedCodingProblems = 0;
    let answeredQuestions = 0;
    let correctAnswers = 0;
    let practiceCompleted = 0;
    for (const { subject, topic } of validTopics) {
      const detail = getPracticeSummary(subject.id, topic.id, topic.practice);
      totalCodingProblems += detail.totalProblems;
      completedCodingProblems += detail.completedProblems;
      answeredQuestions += detail.answeredQuestions;
      correctAnswers += detail.correctAnswers;
      practiceCompleted += detail.completedProblems + detail.answeredQuestions;
    }

    return {
      overallPercent: totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0,
      subjectsStarted,
      completedTopics,
      totalTopics,
      practiceCompleted,
      totalCodingProblems,
      completedCodingProblems,
      answeredQuestions,
      correctAnswers,
      mcqAccuracy: answeredQuestions ? Math.round((correctAnswers / answeredQuestions) * 100) : null,
      savedItemsCount: normalizeSavedItems(progress.savedItems).length,
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
      totalCodingProblems: studySummary.totalCodingProblems,
      completedCodingProblems: studySummary.completedCodingProblems,
      answeredQuestions: studySummary.answeredQuestions,
      correctAnswers: studySummary.correctAnswers,
      mcqAccuracy: studySummary.mcqAccuracy,
      savedItemsCount: studySummary.savedItemsCount,
    };
  }, [progress]);

  return {
    progress,
    storageNotice,
    summary,
    toggleTopic,
    isTopicComplete,
    toggleCodingProblem,
    isCodingProblemComplete,
    getCodingPractice,
    saveCodingPracticeNotes,
    recordCodingAttempt,
    getMcqAttempt,
    answerMcqQuestion,
    resetMcqAttempt,
    getPracticeSummary,
    getTopicProgress,
    getSubjectProgress,
    getTopicStatus,
    getContinueLearning,
    setDailyMission,
    completeDailyMissionTask,
    getStudySummary,
    isSaved,
    toggleSaved,
    removeSaved,
    recordRevisionOutcome,
    setPlacementSimulationConfig,
    startPlacementSimulation,
    updateActivePlacementSimulation,
    submitPlacementSimulation,
    discardActivePlacementSimulation,
  };
}
