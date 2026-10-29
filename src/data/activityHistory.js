import { addLocalDays, localDateKey } from "./revisionQueue.js";

export const ACTIVITY_HISTORY_LIMIT = 500;
export const ACTIVITY_RETENTION_DAYS = 90;

const ACTIVITY_FIELDS = Object.freeze({
  topic_completed: ["subjectId", "topicId"],
  mcq_answered: ["subjectId", "topicId", "questionId", "correct"],
  coding_problem_completed: ["subjectId", "topicId", "problemId"],
  coding_attempt_recorded: ["subjectId", "topicId", "problemId", "outcome"],
  revision_reviewed: ["subjectId", "topicId", "itemType"],
  simulation_submitted: ["focusId"],
  daily_mission_completed: ["date"],
});

function validTimestamp(value) {
  if (typeof value !== "string") return false;
  return Number.isFinite(Date.parse(value));
}

function validField(name, value) {
  if (name === "correct") return typeof value === "boolean";
  if (name === "itemType") return ["topic", "resource", "coding", "mcq"].includes(value);
  if (name === "outcome") return ["solved-independently", "solved-with-hints", "solved-after-review", "still-working"].includes(value);
  if (name === "date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }
  if (name === "focusId") return typeof value === "string" && value.length <= 80;
  return typeof value === "string" && value.length > 0 && value.length <= 160;
}

function newEventId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  } catch { /* use a non-sensitive local fallback */ }
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createActivityEvent(type, metadata = {}, now = new Date(), id = newEventId()) {
  if (!Object.hasOwn(ACTIVITY_FIELDS, type) || !metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime()) || typeof id !== "string" || !id) return null;
  const event = { id, type, timestamp: date.toISOString() };
  for (const field of ACTIVITY_FIELDS[type]) {
    if (metadata[field] !== undefined && validField(field, metadata[field])) event[field] = metadata[field];
  }
  const required = type === "simulation_submitted" ? [] : ACTIVITY_FIELDS[type];
  if (!required.every((field) => Object.hasOwn(event, field))) return null;
  return event;
}

export function normalizeActivityEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event) || typeof event.id !== "string" || !event.id ||
      !Object.hasOwn(ACTIVITY_FIELDS, event.type) || !validTimestamp(event.timestamp)) return null;
  const normalized = { id: event.id, type: event.type, timestamp: new Date(event.timestamp).toISOString() };
  for (const field of ACTIVITY_FIELDS[event.type]) {
    if (event[field] !== undefined && validField(field, event[field])) normalized[field] = event[field];
  }
  const required = event.type === "simulation_submitted" ? [] : ACTIVITY_FIELDS[event.type];
  return required.every((field) => Object.hasOwn(normalized, field)) ? normalized : null;
}

function validTrackingStart(value, nowTime) {
  return validTimestamp(value) && Date.parse(value) <= nowTime;
}

export function getActivityEvents(progress, now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return [];
  const minTime = date.getTime() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const history = Array.isArray(progress?.activityHistory) ? progress.activityHistory : [];
  const byId = new Map();
  for (const entry of history) {
    const event = normalizeActivityEvent(entry);
    if (!event) continue;
    const time = Date.parse(event.timestamp);
    if (time < minTime || time > date.getTime()) continue;
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp) || left.id.localeCompare(right.id))
    .slice(-ACTIVITY_HISTORY_LIMIT);
}

export function appendActivityEvent(progress, eventInput, now = new Date()) {
  const current = progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return current;
  const event = normalizeActivityEvent(eventInput);
  if (!event || Date.parse(event.timestamp) > date.getTime() || Date.parse(event.timestamp) < date.getTime() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000) return current;
  const events = getActivityEvents(current, date);
  if (events.some((item) => item.id === event.id)) return current;
  const nextHistory = [...events, event].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)).slice(-ACTIVITY_HISTORY_LIMIT);
  const next = { ...current, activityHistory: nextHistory };
  if (!validTrackingStart(current.activityTrackingStartedAt, date.getTime())) {
    if (current.activityTrackingStartedAt !== undefined) next.activityTrackingStartedAtMalformedBackup = current.activityTrackingStartedAt;
    next.activityTrackingStartedAt = event.timestamp;
  }
  if (current.activityHistory !== undefined && (!Array.isArray(current.activityHistory) ||
      current.activityHistory.some((entry) => !normalizeActivityEvent(entry)))) next.activityHistoryMalformedBackup = current.activityHistory;
  return next;
}

export function getActivityTrackingStart(progress, now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return null;
  if (validTrackingStart(progress?.activityTrackingStartedAt, date.getTime())) return new Date(progress.activityTrackingStartedAt).toISOString();
  const first = getActivityEvents(progress, date)[0];
  return first?.timestamp ?? null;
}

function localDateFromTimestamp(timestamp) {
  return localDateKey(new Date(timestamp));
}

export function aggregateDailyActivity(progress, days = 7, now = new Date()) {
  const period = days === 30 ? 30 : 7;
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return { period, days: [], activeDays: 0, inactiveDays: 0, unknownDays: period, pendingToday: false, consistencyPercent: null, trackingStartedAt: null };
  const today = localDateKey(date);
  const startDate = addLocalDays(today, 1 - period);
  const trackingStartedAt = getActivityTrackingStart(progress, date);
  const trackingStartDate = trackingStartedAt ? localDateFromTimestamp(trackingStartedAt) : null;
  const byDate = new Map();
  for (const event of getActivityEvents(progress, date)) {
    const key = localDateFromTimestamp(event.timestamp);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(event);
  }
  const resultDays = [];
  for (let index = 0; index < period; index += 1) {
    const key = addLocalDays(startDate, index);
    const events = byDate.get(key) ?? [];
    const tracked = trackingStartDate !== null && key >= trackingStartDate;
    const status = events.length ? "active" : !tracked ? "unknown" : key === today ? "pending" : "inactive";
    const byType = {};
    for (const event of events) byType[event.type] = (byType[event.type] ?? 0) + 1;
    resultDays.push({ date: key, status, eventCount: events.length, byType });
  }
  const activeDays = resultDays.filter((day) => day.status === "active").length;
  const inactiveDays = resultDays.filter((day) => day.status === "inactive").length;
  const unknownDays = resultDays.filter((day) => day.status === "unknown").length;
  const knownDays = activeDays + inactiveDays;
  return {
    period,
    days: resultDays,
    activeDays,
    inactiveDays,
    unknownDays,
    pendingToday: resultDays.at(-1)?.status === "pending",
    consistencyPercent: knownDays ? Math.round(activeDays / knownDays * 100) : null,
    trackingStartedAt,
  };
}

export function calculateCurrentStreak(progress, now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) return null;
  const events = getActivityEvents(progress, date);
  const trackingStartedAt = getActivityTrackingStart(progress, date);
  if (!trackingStartedAt) return null;
  const eventDays = new Set(events.map((event) => localDateFromTimestamp(event.timestamp)));
  const today = localDateKey(date);
  let cursor = today;
  if (!eventDays.has(today)) cursor = addLocalDays(today, -1); // today remains in progress until local midnight
  let streak = 0;
  for (let index = 0; index < ACTIVITY_RETENTION_DAYS; index += 1) {
    if (cursor < localDateFromTimestamp(trackingStartedAt) || !eventDays.has(cursor)) break;
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

export function aggregateActivityTrend(progress, days = 30, now = new Date()) {
  const activity = aggregateDailyActivity(progress, days, now);
  return {
    ...activity,
    series: activity.days.map((day) => ({
      date: day.date,
      status: day.status,
      total: day.eventCount,
      topicCompletions: day.byType.topic_completed ?? 0,
      mcqAnswers: day.byType.mcq_answered ?? 0,
      codingCompletions: day.byType.coding_problem_completed ?? 0,
      codingAttempts: day.byType.coding_attempt_recorded ?? 0,
      revisions: day.byType.revision_reviewed ?? 0,
      simulations: day.byType.simulation_submitted ?? 0,
      missions: day.byType.daily_mission_completed ?? 0,
    })),
  };
}
