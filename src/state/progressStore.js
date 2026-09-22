import { useEffect, useMemo, useRef, useState } from "react";
import { useContent } from "./contentStore.jsx";
import { api } from "../api.js";
import { useAuth } from "./authStore.jsx";

const STORAGE_KEY = "codeprep-progress-local-v1";
const userStorageKey = (userId) => `codeprep-progress-user:${userId}`;
const STATUS_LABELS = {
  completed: "Completed",
  inProgress: "In Progress",
  notStarted: "Not Started",
  locked: "Locked / Upcoming",
};

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readProgress(userId = null) {
  try {
    const key = userId ? userStorageKey(userId) : STORAGE_KEY;
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeProgress(progress, userId = null) {
  const key = userId ? userStorageKey(userId) : STORAGE_KEY;
  window.localStorage.setItem(key, JSON.stringify(progress));
}

function activityKey(item) {
  return [item.at, item.type, item.subjectId, item.topicId, item.itemId, item.label].join("|");
}

function mergeProgress(localProgress, remoteProgress) {
  const merged = { ...localProgress };
  const localBookmarks = Array.isArray(localProgress.bookmarks) ? localProgress.bookmarks : [];
  const remoteBookmarks = Array.isArray(remoteProgress.bookmarks) ? remoteProgress.bookmarks : [];
  const bookmarkMap = new Map([...localBookmarks, ...remoteBookmarks].map((item) => [item.id, item]));
  const localActivity = Array.isArray(localProgress.activity) ? localProgress.activity : [];
  const remoteActivity = Array.isArray(remoteProgress.activity) ? remoteProgress.activity : [];
  const activityMap = new Map([...remoteActivity, ...localActivity].map((item) => [activityKey(item), item]));

  for (const [key, value] of Object.entries(remoteProgress ?? {})) {
    if (key === "bookmarks" || key === "activity" || key === "planner") continue;

    if (typeof value === "boolean") {
      merged[key] = Boolean(localProgress[key]) || value;
      continue;
    }

    if (key.startsWith("mcq:") && value && typeof value === "object") {
      const localAttempt = localProgress[key] && typeof localProgress[key] === "object" ? localProgress[key] : {};
      const localAnswers = localAttempt.answers ?? {};
      const remoteAnswers = value.answers ?? {};
      const answers = { ...remoteAnswers, ...localAnswers };
      merged[key] = {
        answers,
        score: Object.values(answers).filter((answer) => answer?.correct).length,
        completed: Boolean(localAttempt.completed || value.completed),
      };
      continue;
    }

    merged[key] = value;
  }

  const localPlannerTasks = Array.isArray(localProgress?.planner?.tasks) ? localProgress.planner.tasks : [];
  const remotePlannerTasks = Array.isArray(remoteProgress?.planner?.tasks) ? remoteProgress.planner.tasks : [];
  if (localPlannerTasks.length || remotePlannerTasks.length) {
    const plannerMap = new Map([...remotePlannerTasks, ...localPlannerTasks].map((task) => [task.id, task]));
    merged.planner = { tasks: [...plannerMap.values()].sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")) || Number(a.createdAt || 0) - Number(b.createdAt || 0)) };
  }

  if (bookmarkMap.size) merged.bookmarks = [...bookmarkMap.values()];
  if (activityMap.size) merged.activity = [...activityMap.values()].sort((a, b) => b.at - a.at).slice(0, 100);
  return merged;
}

export function useProgress() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { subjects } = useContent();
  const [progress, setProgress] = useState(() => readProgress(null));
  const [syncStatus, setSyncStatus] = useState(isAuthenticated ? "syncing" : "local");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const hydratedRef = useRef(!isAuthenticated);
  const saveTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      hydratedRef.current = true;
      setProgress(readProgress(null));
      setSyncStatus("local");
      return;
    }
    hydratedRef.current = false;
    setSyncStatus("syncing");
    api.getProgress()
      .then((result) => {
        const userLocal = readProgress(user.id);
        const anonymousLocal = readProgress(null);
        const merged = mergeProgress(mergeProgress(userLocal, result.progress ?? {}), anonymousLocal);
        writeProgress(merged, user.id);
        if (mountedRef.current) {
          setProgress(merged);
          setSyncStatus("synced");
          setLastSyncedAt(new Date());
        }
        hydratedRef.current = true;
        return api.saveProgress(merged);
      })
      .then(() => {
        if (mountedRef.current) {
          setSyncStatus("synced");
          setLastSyncedAt(new Date());
        }
      })
      .catch((error) => {
        console.error("Progress sync failed:", error);
        hydratedRef.current = true;
        if (mountedRef.current) setSyncStatus("error");
      });
  }, [authLoading, isAuthenticated, user?.id]);

  useEffect(() => {
    writeProgress(progress, isAuthenticated ? user?.id : null);
    if (authLoading || !isAuthenticated || !hydratedRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSyncStatus("syncing");
    saveTimerRef.current = window.setTimeout(() => {
      api.saveProgress(progress)
        .then(() => {
          if (!mountedRef.current) return;
          setSyncStatus("synced");
          setLastSyncedAt(new Date());
        })
        .catch((error) => {
          console.error("Progress save failed:", error);
          if (mountedRef.current) setSyncStatus("error");
        });
    }, 600);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [progress, authLoading, isAuthenticated, user?.id]);

  function addActivity(current, entry) {
    const activity = [
      { id: `${Date.now()}-${entry.type}`, at: Date.now(), ...entry },
      ...(Array.isArray(current.activity) ? current.activity : []),
    ];
    const unique = new Map(activity.map((item) => [activityKey(item), item]));
    return [...unique.values()].sort((a, b) => b.at - a.at).slice(0, 100);
  }

  function findNames(subjectId, topicId) {
    const subject = subjects.find((item) => item.id === subjectId);
    const topic = subject?.topics.find((item) => item.id === topicId);
    return { subjectName: subject?.name || subjectId, topicTitle: topic?.title || topicId };
  }

  function toggleTopic(subjectId, topicId) {
    const key = `${subjectId}:${topicId}`;
    const names = findNames(subjectId, topicId);
    setProgress((current) => {
      const nextValue = !current[key];
      return {
        ...current,
        [key]: nextValue,
        activity: addActivity(current, { type: nextValue ? "topic-complete" : "topic-uncomplete", subjectId, topicId, label: nextValue ? "Completed topic" : "Reopened topic", ...names }),
      };
    });
  }

  function isTopicComplete(subjectId, topicId) { return Boolean(progress[`${subjectId}:${topicId}`]); }
  function codingProblemKey(subjectId, topicId, problemId) { return `coding:${subjectId}:${topicId}:${problemId}`; }
  function mcqAttemptKey(subjectId, topicId) { return `mcq:${subjectId}:${topicId}`; }

  function toggleCodingProblem(subjectId, topicId, problemId) {
    const key = codingProblemKey(subjectId, topicId, problemId);
    const names = findNames(subjectId, topicId);
    setProgress((current) => {
      const nextValue = !current[key];
      return {
        ...current,
        [key]: nextValue,
        activity: addActivity(current, { type: nextValue ? "coding-complete" : "coding-uncomplete", subjectId, topicId, itemId: problemId, label: nextValue ? "Completed coding problem" : "Reopened coding problem", ...names }),
      };
    });
  }

  function isCodingProblemComplete(subjectId, topicId, problemId) { return Boolean(progress[codingProblemKey(subjectId, topicId, problemId)]); }

  function getMcqAttempt(subjectId, topicId) {
    const attempt = progress[mcqAttemptKey(subjectId, topicId)];
    return attempt && typeof attempt === "object" ? attempt : { answers: {}, score: 0, completed: false };
  }

  function answerMcqQuestion(subjectId, topicId, question, selectedAnswer, totalQuestions) {
    const key = mcqAttemptKey(subjectId, topicId);
    const names = findNames(subjectId, topicId);
    setProgress((current) => {
      const currentAttempt = current[key] && typeof current[key] === "object" ? current[key] : { answers: {}, score: 0, completed: false };
      const answers = { ...currentAttempt.answers, [question.id]: { selectedAnswer, correct: selectedAnswer === question.correctAnswer } };
      const score = Object.values(answers).filter((answer) => answer.correct).length;
      const completed = Object.keys(answers).length >= totalQuestions;
      return {
        ...current,
        [key]: { answers, score, completed },
        activity: addActivity(current, { type: "mcq-answer", subjectId, topicId, itemId: question.id, label: "Answered MCQ", ...names }),
      };
    });
  }

  function resetMcqAttempt(subjectId, topicId) {
    const key = mcqAttemptKey(subjectId, topicId);
    setProgress((current) => { const next = { ...current }; delete next[key]; return { ...next, activity: addActivity(next, { type: "mcq-reset", subjectId, topicId, label: "Reset MCQ attempt", ...findNames(subjectId, topicId) }) }; });
  }

  function getBookmarks() { return Array.isArray(progress.bookmarks) ? progress.bookmarks : []; }
  function isBookmarked(bookmarkId) { return getBookmarks().some((bookmark) => bookmark.id === bookmarkId); }

  function toggleBookmark(bookmark) {
    setProgress((current) => {
      const bookmarks = Array.isArray(current.bookmarks) ? current.bookmarks : [];
      const exists = bookmarks.some((item) => item.id === bookmark.id);
      const nextBookmarks = exists ? bookmarks.filter((item) => item.id !== bookmark.id) : [...bookmarks, { ...bookmark, savedAt: Date.now() }];
      return { ...current, bookmarks: nextBookmarks, activity: addActivity(current, { type: exists ? "bookmark-remove" : "bookmark-add", label: exists ? "Removed saved item" : "Saved item", subjectId: bookmark.subjectId, topicId: bookmark.topicId, itemId: bookmark.id, subjectName: bookmark.subjectName, topicTitle: bookmark.topicTitle }) };
    });
  }

  function getPracticeSummary(subjectId, topicId, practice) {
    const problems = practice?.problems ?? [];
    const questions = practice?.questions ?? [];
    const completedProblems = problems.filter((problem) => isCodingProblemComplete(subjectId, topicId, problem.id)).length;
    const attempt = getMcqAttempt(subjectId, topicId);
    const answeredQuestions = Object.keys(attempt.answers ?? {}).length;
    return { completedProblems, totalProblems: problems.length, answeredQuestions, totalQuestions: questions.length, score: attempt.score ?? 0, completed: practice?.type === "coding" ? completedProblems === problems.length && problems.length > 0 : attempt.completed };
  }

  function getTopicProgress(subjectId, topic) {
    const practiceSummary = getPracticeSummary(subjectId, topic.id, topic.practice);
    const practiceTotal = practiceSummary.totalProblems + practiceSummary.totalQuestions;
    const practiceCompleted = practiceSummary.completedProblems + practiceSummary.answeredQuestions;
    const practicePercent = practiceTotal ? Math.round((practiceCompleted / practiceTotal) * 100) : 0;
    const complete = isTopicComplete(subjectId, topic.id);
    return { percent: complete ? 100 : practicePercent, complete, practiceCompleted, practiceTotal, completedProblems: practiceSummary.completedProblems, totalProblems: practiceSummary.totalProblems, answeredQuestions: practiceSummary.answeredQuestions, totalQuestions: practiceSummary.totalQuestions, score: practiceSummary.score };
  }

  function getSubjectProgress(subject) {
    if (!subject.topics.length) return { percent: 0, completedTopics: 0, startedTopics: 0, totalTopics: 0 };
    const topicProgress = subject.topics.map((topic) => getTopicProgress(subject.id, topic));
    const totalPercent = topicProgress.reduce((total, item) => total + item.percent, 0);
    return { percent: Math.round(totalPercent / subject.topics.length), completedTopics: topicProgress.filter((item) => item.complete).length, startedTopics: topicProgress.filter((item) => item.percent > 0).length, totalTopics: subject.topics.length };
  }

  function getTopicStatus(subject, topic) {
    const topicIndex = subject.topics.findIndex((item) => item.id === topic.id);
    const progressDetails = getTopicProgress(subject.id, topic);
    if (progressDetails.complete) return { id: "completed", label: STATUS_LABELS.completed };
    if (progressDetails.percent > 0) return { id: "inProgress", label: STATUS_LABELS.inProgress };
    const firstOpenIndex = subject.topics.findIndex((item) => !isTopicComplete(subject.id, item.id));
    const availableThroughIndex = firstOpenIndex === -1 ? subject.topics.length - 1 : firstOpenIndex + 1;
    if (topicIndex > availableThroughIndex) return { id: "locked", label: STATUS_LABELS.locked };
    return { id: "notStarted", label: STATUS_LABELS.notStarted };
  }

  function getContinueLearning() {
    for (const subject of subjects) {
      const inProgressTopic = subject.topics.find((topic) => getTopicStatus(subject, topic).id === "inProgress");
      if (inProgressTopic) return { subject, topic: inProgressTopic, reason: "Continue your current topic" };
      const nextTopic = subject.topics.find((topic) => getTopicStatus(subject, topic).id === "notStarted");
      if (nextTopic) return { subject, topic: nextTopic, reason: "Next recommended topic" };
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
    const practiceCompleted = subjects.reduce((subjectTotal, subject) => subjectTotal + subject.topics.reduce((topicTotal, topic) => topicTotal + getTopicProgress(subject.id, topic).practiceCompleted, 0), 0);
    return { overallPercent: subjectsWithTopics ? Math.round(totalPercent / subjectsWithTopics) : 0, subjectsStarted, completedTopics, totalTopics, practiceCompleted };
  }

  function getAnalytics() {
    const study = getStudySummary();
    const subjectAnalytics = subjects.map((subject) => {
      const progressDetails = getSubjectProgress(subject);
      const practiceCompleted = subject.topics.reduce((total, topic) => total + getTopicProgress(subject.id, topic).practiceCompleted, 0);
      return { ...subject, ...progressDetails, practiceCompleted };
    });
    let mcqAnswered = 0;
    let mcqCorrect = 0;
    for (const [key, value] of Object.entries(progress)) {
      if (!key.startsWith("mcq:") || !value || typeof value !== "object") continue;
      const answers = value.answers ?? {};
      mcqAnswered += Object.keys(answers).length;
      mcqCorrect += Object.values(answers).filter((answer) => answer?.correct).length;
    }
    const activities = Array.isArray(progress.activity) ? progress.activity : [];
    const studyActivities = activities.filter((item) => !String(item.type || "").startsWith("bookmark-"));
    const localDayKey = (value) => {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const daySet = new Set(studyActivities.map((item) => localDayKey(item.at)));
    const sortedDays = [...daySet].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const todayKey = localDayKey(cursor);
    const yesterday = new Date(cursor);
    yesterday.setDate(yesterday.getDate() - 1);
    const startKey = daySet.has(todayKey) ? todayKey : localDayKey(yesterday);
    if (daySet.has(startKey)) {
      cursor = new Date(`${startKey}T00:00:00`);
      while (daySet.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
    const recentActivity = activities.slice().sort((a, b) => b.at - a.at).slice(0, 8);
    return {
      overallPercent: study.overallPercent,
      completedTopics: study.completedTopics,
      totalTopics: study.totalTopics,
      practiceCompleted: study.practiceCompleted,
      subjectsStarted: study.subjectsStarted,
      bookmarks: getBookmarks().length,
      currentStreak: streak,
      activeDays: daySet.size,
      mcqAccuracy: mcqAnswered ? Math.round((mcqCorrect / mcqAnswered) * 100) : 0,
      subjects: subjectAnalytics,
      recentActivity,
      nextFocus: getContinueLearning(),
      activeDateList: sortedDays.slice(0, 14),
    };
  }

  const summary = useMemo(() => {
    const studySummary = getStudySummary();
    return { totalTopics: studySummary.totalTopics, completedTopics: studySummary.completedTopics, percent: studySummary.overallPercent, subjectsStarted: studySummary.subjectsStarted, practiceCompleted: studySummary.practiceCompleted };
  }, [progress, subjects]);


  function getPlannerTasks() {
    return Array.isArray(progress.planner?.tasks) ? progress.planner.tasks : [];
  }

  function addPlannerTask(task) {
    const now = Date.now();
    const nextTask = {
      id: task.id || `task-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(task.title || "Study task").trim(),
      subjectId: task.subjectId || "",
      topicId: task.topicId || "",
      dueDate: task.dueDate || new Date().toISOString().slice(0, 10),
      dueTime: task.dueTime || "",
      kind: task.kind || "Study",
      completed: false,
      createdAt: now,
    };
    setProgress((current) => ({
      ...current,
      planner: { tasks: [...(current.planner?.tasks || []), nextTask] },
      activity: addActivity(current, {
        type: "planner-add",
        subjectId: nextTask.subjectId,
        topicId: nextTask.topicId,
        itemId: nextTask.id,
        label: "Added study task",
        ...findNames(nextTask.subjectId, nextTask.topicId),
      }),
    }));
    return nextTask;
  }

  function togglePlannerTask(taskId) {
    setProgress((current) => {
      const existing = current.planner?.tasks || [];
      const target = existing.find((task) => task.id === taskId);
      if (!target) return current;
      const completed = !target.completed;
      const tasks = existing.map((task) => task.id === taskId ? { ...task, completed } : task);
      return {
        ...current,
        planner: { tasks },
        activity: addActivity(current, {
          type: completed ? "planner-complete" : "planner-reopen",
          subjectId: target.subjectId,
          topicId: target.topicId,
          itemId: target.id,
          label: completed ? "Completed study task" : "Reopened study task",
          ...findNames(target.subjectId, target.topicId),
        }),
      };
    });
  }

  function deletePlannerTask(taskId) {
    setProgress((current) => ({
      ...current,
      planner: { tasks: (current.planner?.tasks || []).filter((task) => task.id !== taskId) },
      activity: addActivity(current, { type: "planner-delete", itemId: taskId, label: "Deleted study task" }),
    }));
  }

  function clearCompletedPlannerTasks() {
    setProgress((current) => ({
      ...current,
      planner: { tasks: (current.planner?.tasks || []).filter((task) => !task.completed) },
      activity: addActivity(current, { type: "planner-clear", label: "Cleared completed study tasks" }),
    }));
  }

  function getPlannerSummary() {
    const tasks = getPlannerTasks();
    const today = localDateKey();
    const todayTasks = tasks.filter((task) => task.dueDate === today);
    const overdue = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today);
    return {
      tasks,
      todayTasks,
      overdue,
      todayCompleted: todayTasks.filter((task) => task.completed).length,
      todayTotal: todayTasks.length,
      upcoming: tasks.filter((task) => !task.completed && task.dueDate > today).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 6),
    };
  }

  function planNextTopic() {
    const next = getContinueLearning();
    if (!next) return;
    const dueDate = localDateKey();
    const created = [
      addPlannerTask({ title: `Learn ${next.topic.title}`, subjectId: next.subject.id, topicId: next.topic.id, dueDate, kind: "Learn" }),
      addPlannerTask({ title: `Practice ${next.topic.title}`, subjectId: next.subject.id, topicId: next.topic.id, dueDate, kind: "Practice" }),
    ];
    return created;
  }

  function syncNow() {
    if (!isAuthenticated) return Promise.resolve();
    setSyncStatus("syncing");
    return api.saveProgress(progress).then(() => { if (mountedRef.current) { setSyncStatus("synced"); setLastSyncedAt(new Date()); } }).catch((error) => { if (mountedRef.current) setSyncStatus("error"); throw error; });
  }

  return { progress, summary, syncStatus, lastSyncedAt, syncNow, toggleTopic, isTopicComplete, toggleCodingProblem, isCodingProblemComplete, getMcqAttempt, answerMcqQuestion, resetMcqAttempt, getBookmarks, isBookmarked, toggleBookmark, getPracticeSummary, getTopicProgress, getSubjectProgress, getTopicStatus, getContinueLearning, getStudySummary, getAnalytics, getPlannerTasks, addPlannerTask, togglePlannerTask, deletePlannerTask, clearCompletedPlannerTasks, getPlannerSummary, planNextTopic };
}

