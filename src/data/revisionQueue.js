export const REVISION_OUTCOMES = Object.freeze({ again: 1, hard: 2, gotIt: 4, easy: 7 });

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function addLocalDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function revisionItemKey(item) {
  return JSON.stringify([item.type, item.subjectId, item.topicId, item.itemId]);
}

export function calculateRevisionSchedule(previous, outcome, today = localDateKey()) {
  const base = REVISION_OUTCOMES[outcome];
  if (!base || !validDateKey(today)) return null;
  const oldStage = Number.isInteger(previous?.stage) && previous.stage >= 0 ? previous.stage : 0;
  const stage = outcome === "again" ? 0 : oldStage + 1;
  const intervalDays = outcome === "again" ? 1 : Math.min(30, Math.round(base * (1.5 ** oldStage)));
  return {
    reviewedAt: today,
    dueDate: addLocalDays(today, intervalDays),
    stage,
    reviewCount: (Number.isInteger(previous?.reviewCount) && previous.reviewCount >= 0 ? previous.reviewCount : 0) + 1,
    lastOutcome: outcome,
    intervalDays,
  };
}

function normalizeSchedule(schedule) {
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule) || !validDateKey(schedule.dueDate)) return null;
  return {
    ...schedule,
    dueDate: schedule.dueDate,
    stage: Number.isInteger(schedule.stage) && schedule.stage >= 0 ? schedule.stage : 0,
    reviewCount: Number.isInteger(schedule.reviewCount) && schedule.reviewCount >= 0 ? schedule.reviewCount : 0,
  };
}

function resolveItem(catalog, saved) {
  const subject = catalog.find((entry) => entry.id === saved.subjectId);
  const topic = subject?.topics?.find((entry) => entry.id === saved.topicId);
  if (!subject || !topic) return { ...saved, subject, topic, item: null, title: "Saved item no longer available", available: false };
  let item = null;
  if (saved.type === "topic") item = topic.id === saved.itemId ? topic : null;
  else if (saved.type === "resource") item = topic.resources?.find((entry) => entry.id === saved.itemId);
  else if (saved.type === "coding") item = topic.practice?.problems?.find((entry) => entry.id === saved.itemId);
  else if (saved.type === "mcq") item = topic.practice?.questions?.find((entry) => entry.id === saved.itemId);
  return { ...saved, subject, topic, item, title: item?.title ?? item?.prompt ?? "Saved item no longer available", available: Boolean(item) };
}

export function buildRevisionQueue(catalog, progressApi, now = new Date()) {
  const today = localDateKey(now);
  const entries = new Map();
  const add = (saved, reason, priority) => {
    const key = revisionItemKey(saved);
    const current = entries.get(key);
    if (current) {
      current.isSaved ||= reason === "Saved for revision";
      current.inProgress ||= reason === "In progress";
      if (priority > current.priority) { current.reason = reason; current.priority = priority; }
      return current;
    }
    const resolved = resolveItem(catalog, saved);
    const schedule = normalizeSchedule(progressApi.progress.revisionSchedules?.[key]);
    const dueDate = schedule?.dueDate ?? today;
    const dueStatus = dueDate < today ? "overdue" : dueDate === today ? "dueToday" : "upcoming";
    const entry = { ...resolved, key, reason, priority, isSaved: reason === "Saved for revision", inProgress: reason === "In progress", schedule, dueDate, dueStatus };
    entries.set(key, entry);
    return entry;
  };

  for (const subject of catalog) for (const topic of subject.topics ?? []) {
    const attempt = progressApi.getMcqAttempt(subject.id, topic.id);
    for (const question of topic.practice?.questions ?? []) {
      const answer = attempt.answers?.[question.id];
      if (answer && Array.isArray(question.options) && typeof question.correctAnswer === "string" &&
          question.options.includes(answer.selectedAnswer) && question.options.includes(question.correctAnswer) && answer.selectedAnswer !== question.correctAnswer) {
        add({ type: "mcq", subjectId: subject.id, topicId: topic.id, itemId: question.id }, "Previously answered incorrectly", 3);
      }
    }
  }
  for (const saved of Array.isArray(progressApi.progress.savedItems) ? progressApi.progress.savedItems : []) {
    if (saved && ["topic", "resource", "coding", "mcq"].includes(saved.type)) add(saved, "Saved for revision", 2);
  }
  for (const subject of catalog) for (const topic of subject.topics ?? []) {
    if (progressApi.getTopicStatus(subject, topic).id === "inProgress") {
      add({ type: "topic", subjectId: subject.id, topicId: topic.id, itemId: topic.id }, "In progress", 1);
    }
  }
  return [...entries.values()].map(({ priority, ...entry }) => entry);
}

