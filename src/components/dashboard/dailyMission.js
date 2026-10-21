import { buildRevisionQueue } from "../../data/revisionQueue.js";

const FOCUS_OPTIONS = [
  { id: "balanced", label: "Balanced preparation", subjectIds: null },
  { id: "dsa", label: "DSA and coding", subjectIds: ["dsa"] },
  { id: "core-cs", label: "Core CS: DBMS, OS, CN and OOP", subjectIds: ["dbms", "os", "cn", "oop"] },
  { id: "aptitude", label: "Aptitude", subjectIds: ["aptitude"] },
  { id: "interview-prep", label: "Interview Preparation", subjectIds: ["interview-prep"] },
  { id: "revision", label: "Revision of saved / in-progress material", subjectIds: null },
];

// Metadata durations win; these fallback estimates are planning aids, not measured task times.
const ESTIMATED_MINUTES = Object.freeze({ notes: 10, mcq: 10, coding: 20, lecture: 15, resource: 15, revision: 10 });

export const MISSION_DURATIONS = [20, 45, 60, 120];
export const MISSION_FOCUSES = FOCUS_OPTIONS;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDuration(value) {
  if (typeof value !== "string") return null;
  const hours = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)s?/i);
  const minutes = value.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute)s?/i);
  const total = (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : null;
}

function resourceDuration(resource) {
  if (Number.isFinite(resource?.minutes) && resource.minutes > 0) return { minutes: Math.round(resource.minutes), estimated: false };
  const parsed = parseDuration(resource?.duration);
  if (parsed) return { minutes: parsed, estimated: false };
  return { minutes: /lecture|video/i.test(resource?.type ?? "") ? ESTIMATED_MINUTES.lecture : ESTIMATED_MINUTES.resource, estimated: true };
}

function resourceMinutes(resource) {
  return resourceDuration(resource).minutes;
}

function uniqueById(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    if (typeof item?.id !== "string" || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function orderedTopics(catalog, subjectIds) {
  return (Array.isArray(catalog) ? catalog : [])
    .filter((subject) => !subjectIds || subjectIds.includes(subject.id))
    .flatMap((subject) => uniqueById(subject.topics)
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .map((topic) => ({ subject, topic })));
}

function getLearningTopic(catalog, progressApi, subjectIds, recommendation) {
  if (!subjectIds && recommendation?.subject?.id && recommendation?.topic?.id && !recommendation.complete) {
    const recommended = catalog.find((subject) => subject.id === recommendation.subject.id);
    const topic = recommended?.topics?.find((item) => item.id === recommendation.topic.id);
    if (recommended && topic) return { subject: recommended, topic };
  }
  const next = progressApi.getContinueLearning(subjectIds);
  return next && !next.complete ? { subject: next.subject, topic: next.topic } : null;
}

function makeTask(type, targetType, subject, topic, targetId = null) {
  return {
    id: `${type}:${subject.id}:${topic.id}:${targetType}:${targetId ?? "topic"}`,
    type,
    targetType,
    subjectId: subject.id,
    topicId: topic.id,
    ...(targetId ? { targetId } : {}),
  };
}

function getLearnCandidate(subject, topic, budget, requiredPracticeMinutes) {
  const resources = uniqueById(topic.resources).filter((item) => typeof item.title === "string" && item.title);
  const notes = Array.isArray(topic.notes) ? topic.notes.filter((note) => typeof note === "string" && note.trim()) : [];
  const resource = resources[0];
  if (resource) {
    const minutes = resourceMinutes(resource);
    if (minutes + requiredPracticeMinutes <= budget || !notes.length) {
      return { task: makeTask("learn", "resource", subject, topic, resource.id), minutes };
    }
  }
  if (notes.length) return { task: makeTask("learn", "notes", subject, topic), minutes: ESTIMATED_MINUTES.notes };
  if (resource) return { task: makeTask("learn", "resource", subject, topic, resource.id), minutes: resourceMinutes(resource) };
  return null;
}

function findCodingCandidate(topics, progressApi) {
  for (const { subject, topic } of topics) {
    const problem = uniqueById(topic.practice?.problems).find((item) => !progressApi.isCodingProblemComplete(subject.id, topic.id, item.id));
    if (problem) return { task: makeTask("practice", "coding", subject, topic, problem.id), minutes: ESTIMATED_MINUTES.coding };
  }
  return null;
}

function findMcqCandidate(topics, progressApi) {
  const candidates = topics.map(({ subject, topic }) => {
    const questions = uniqueById(topic.practice?.questions).filter((question) =>
      Array.isArray(question.options) && typeof question.correctAnswer === "string" && question.options.includes(question.correctAnswer),
    );
    if (!questions.length) return null;
    const summary = progressApi.getPracticeSummary(subject.id, topic.id, topic.practice);
    return summary.answeredQuestions >= questions.length ? null : { task: makeTask("practice", "mcq", subject, topic), minutes: ESTIMATED_MINUTES.mcq, answered: summary.answeredQuestions };
  }).filter(Boolean);
  candidates.sort((left, right) => Number(right.answered > 0) - Number(left.answered > 0));
  return candidates[0] ?? null;
}

function findRevisionCandidates(catalog, progressApi, inScopeTopics) {
  const inScope = new Set(inScopeTopics.map(({ subject }) => subject.id));
  const queue = buildRevisionQueue(catalog, progressApi);
  const ranked = queue.filter((entry) => entry.available && inScope.has(entry.subjectId));
  const rank = (entry) => entry.dueStatus === "overdue" ? 0
    : entry.dueStatus === "dueToday" && (!entry.inProgress || entry.isSaved || entry.reason !== "In progress") ? 1
      : entry.isSaved ? 2 : entry.inProgress ? 3 : 4;
  ranked.sort((left, right) => rank(left) - rank(right) || left.title.localeCompare(right.title));
  const seen = new Set();
  const candidates = ranked.flatMap((entry) => {
    const task = makeTask("revise", entry.type, entry.subject, entry.topic, entry.itemId);
    if (seen.has(task.id)) return [];
    seen.add(task.id);
    const minutes = entry.type === "resource" ? resourceMinutes(entry.item) : ESTIMATED_MINUTES.revision;
    return [{ task, minutes }];
  });
  return candidates;
}

export function generateDailyMission({ catalog, progressApi, duration, focus, recommendation, date = new Date() }) {
  const focusOption = FOCUS_OPTIONS.find((item) => item.id === focus) ?? FOCUS_OPTIONS[0];
  const scope = orderedTopics(catalog, focusOption.subjectIds);
  const isRevision = focusOption.id === "revision";
  const learning = isRevision ? null : getLearningTopic(catalog, progressApi, focusOption.subjectIds, recommendation);
  const coding = focusOption.id === "core-cs" || focusOption.id === "aptitude" || focusOption.id === "interview-prep"
    ? null
    : findCodingCandidate(scope, progressApi);
  const balancedMcqScope = focusOption.id === "balanced" && learning
    ? scope.filter(({ subject }) => subject.id !== learning.subject.id)
    : scope;
  const mcq = focusOption.id === "dsa"
    ? null
    : findMcqCandidate(balancedMcqScope, progressApi) ?? (balancedMcqScope === scope ? null : findMcqCandidate(scope, progressApi));
  const primaryPracticeMinutes = focusOption.id === "dsa" ? coding?.minutes ?? 0 : mcq?.minutes ?? coding?.minutes ?? 0;
  const learn = learning ? getLearnCandidate(learning.subject, learning.topic, duration, primaryPracticeMinutes) : null;
  const revisions = findRevisionCandidates(catalog, progressApi, scope);
  const distinctRevisions = revisions.filter(({ task }) =>
    !learning || task.targetType !== "topic" || task.subjectId !== learning.subject.id || task.topicId !== learning.topic.id,
  );

  let candidates;
  if (isRevision) {
    candidates = distinctRevisions;
  } else if (focusOption.id === "dsa") {
    candidates = [coding, learn, mcq, ...distinctRevisions].filter(Boolean);
  } else if (focusOption.id === "balanced") {
    candidates = [learn, mcq, coding, ...distinctRevisions].filter(Boolean);
  } else {
    candidates = [learn, mcq, ...distinctRevisions].filter(Boolean);
  }

  const selected = [];
  let remaining = Number(duration) || 45;
  for (const candidate of candidates) {
    if (selected.length >= 5) break;
    if (selected.some(({ task }) => task.id === candidate.task.id)) continue;
    if (candidate.minutes <= remaining) {
      selected.push(candidate);
      remaining -= candidate.minutes;
    }
  }

  if (!selected.length && candidates.length) {
    const shortest = [...candidates].sort((left, right) => left.minutes - right.minutes)[0];
    selected.push(shortest);
  }

  return {
    date: getLocalDateKey(date),
    duration: Number(duration) || 45,
    focus: focusOption.id,
    tasks: selected.map(({ task }) => task),
    completedTaskIds: [],
  };
}

export function resolveMissionTask(task, catalog) {
  if (!task || typeof task !== "object") return { available: false, reason: "This mission task is malformed." };
  const subject = (Array.isArray(catalog) ? catalog : []).find((item) => item.id === task.subjectId);
  const topic = subject?.topics?.find((item) => item.id === task.topicId);
  if (!subject || !topic) return { available: false, reason: "Its subject or topic is no longer in the catalog." };

  let item = null;
  let title = "";
  let href = `/subjects/${subject.id}/topics/${topic.id}#overview`;
  let minutes = 10;
  let estimated = true;
  if (task.targetType === "resource") {
    item = uniqueById(topic.resources).find((value) => value.id === task.targetId);
    title = item?.title ?? "";
    href = `/subjects/${subject.id}/topics/${topic.id}#learn`;
    if (item) ({ minutes, estimated } = resourceDuration(item));
  } else if (task.targetType === "notes") {
    item = Array.isArray(topic.notes) ? topic.notes.filter((note) => typeof note === "string" && note.trim()) : [];
    title = item.length ? `Review ${topic.title} short notes` : "";
    href = `/subjects/${subject.id}/topics/${topic.id}#notes`;
    minutes = ESTIMATED_MINUTES.notes;
  } else if (task.targetType === "coding") {
    item = uniqueById(topic.practice?.problems).find((value) => value.id === task.targetId);
    title = item?.title ?? "";
    href = `/subjects/${subject.id}/topics/${topic.id}#practice`;
    minutes = ESTIMATED_MINUTES.coding;
  } else if (task.targetType === "mcq") {
    item = uniqueById(topic.practice?.questions).filter((question) => Array.isArray(question.options) && typeof question.correctAnswer === "string");
    title = item.length ? `Practice ${topic.title} MCQs` : "";
    href = `/subjects/${subject.id}/topics/${topic.id}#practice`;
    minutes = ESTIMATED_MINUTES.mcq;
  } else if (task.targetType === "topic") {
    item = topic;
    title = topic.title;
    href = `/subjects/${subject.id}/topics/${topic.id}#overview`;
    minutes = ESTIMATED_MINUTES.revision;
  } else {
    return { available: false, reason: "This mission task type is no longer supported." };
  }

  if (!item || !title) return { available: false, subject, topic, reason: "This item is no longer in the current catalog." };
  if (task.type === "revise" && task.targetType !== "topic") {
    if (task.targetType === "resource") item = uniqueById(topic.resources).find((value) => value.id === task.targetId);
    else if (task.targetType === "coding") item = uniqueById(topic.practice?.problems).find((value) => value.id === task.targetId);
    else if (task.targetType === "mcq") item = uniqueById(topic.practice?.questions).find((value) => value.id === task.targetId);
    if (item) title = item.title ?? item.prompt ?? title;
  }
  return { available: true, subject, topic, item, title, href, minutes, estimated };
}

export function missionTaskDone(task, resolved, progressApi, completedTaskIds = []) {
  if (!resolved?.available) return false;
  if (Array.isArray(completedTaskIds) && completedTaskIds.includes(task.id)) return true;
  if (task.type === "practice" && task.targetType === "coding") return progressApi.isCodingProblemComplete(task.subjectId, task.topicId, task.targetId);
  if (task.type === "practice" && task.targetType === "mcq") {
    const summary = progressApi.getPracticeSummary(task.subjectId, task.topicId, resolved.topic.practice);
    return summary.totalQuestions > 0 && summary.answeredQuestions >= summary.totalQuestions;
  }
  return false;
}
