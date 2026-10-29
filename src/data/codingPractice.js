export const CODING_NOTE_FIELDS = Object.freeze([
  ["approach", "My approach"],
  ["keyInsight", "Key insight"],
  ["timeComplexity", "Time complexity"],
  ["spaceComplexity", "Space complexity"],
  ["learned", "What I learned"],
  ["mistakeToAvoid", "Mistake to avoid"],
]);

export const CODING_ATTEMPT_OUTCOMES = Object.freeze([
  ["solved-independently", "Solved independently"],
  ["solved-with-hints", "Solved with hints"],
  ["solved-after-review", "Solved after reviewing a solution"],
  ["still-working", "Still working"],
]);

export const CODING_ATTEMPT_LIMIT = 500;
export const CODING_ATTEMPTS_PER_PROBLEM_LIMIT = 50;
const MAX_NOTE_LENGTH = 4000;
const MAX_REFLECTION_LENGTH = 2000;
const OUTCOMES = new Set(CODING_ATTEMPT_OUTCOMES.map(([value]) => value));

export function codingProblemKey(subjectId, topicId, problemId) {
  if (![subjectId, topicId, problemId].every((value) => typeof value === "string" && value)) return null;
  return JSON.stringify([subjectId, topicId, problemId]);
}

export function normalizeCodingNotes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(CODING_NOTE_FIELDS.map(([field]) => [
    field,
    typeof value[field] === "string" ? value[field].slice(0, MAX_NOTE_LENGTH) : "",
  ]));
}

export function normalizeCodingAttempt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string" || !value.id ||
      !OUTCOMES.has(value.outcome) || typeof value.timestamp !== "string" || !Number.isFinite(Date.parse(value.timestamp))) return null;
  return {
    id: value.id,
    timestamp: new Date(value.timestamp).toISOString(),
    outcome: value.outcome,
    ...(typeof value.reflection === "string" && value.reflection.trim() ? { reflection: value.reflection.slice(0, MAX_REFLECTION_LENGTH) } : {}),
  };
}

export function createCodingAttempt({ outcome, reflection = "", now = new Date(), id } = {}) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime()) || !OUTCOMES.has(outcome) || typeof reflection !== "string") return null;
  let attemptId = id;
  if (!attemptId) {
    try { attemptId = globalThis.crypto?.randomUUID?.(); } catch { /* use a local fallback */ }
    attemptId ||= `coding-attempt-${date.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return normalizeCodingAttempt({ id: attemptId, timestamp: date.toISOString(), outcome, reflection });
}

function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function normalizeAttempts(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Map();
  for (const candidate of value) {
    const attempt = normalizeCodingAttempt(candidate);
    if (attempt && !unique.has(attempt.id)) unique.set(attempt.id, attempt);
  }
  return [...unique.values()].sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp) || right.id.localeCompare(left.id))
    .slice(0, CODING_ATTEMPTS_PER_PROBLEM_LIMIT);
}

export function getCodingPracticeRecord(progress, subjectId, topicId, problemId) {
  const key = codingProblemKey(subjectId, topicId, problemId);
  const codingPractice = objectRecord(progress?.codingPractice);
  const record = key && objectRecord(codingPractice?.[key]);
  return {
    notes: normalizeCodingNotes(record?.notes) ?? normalizeCodingNotes({}),
    notesUpdatedAt: typeof record?.notesUpdatedAt === "string" && Number.isFinite(Date.parse(record.notesUpdatedAt)) ? record.notesUpdatedAt : null,
    attempts: normalizeAttempts(record?.attempts),
    attemptCount: Number.isInteger(record?.attemptCount) && record.attemptCount >= 0
      ? Math.max(record.attemptCount, normalizeAttempts(record.attempts).length)
      : normalizeAttempts(record?.attempts).length,
  };
}

function copyRecord(progress, key) {
  const current = progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  const rawContainer = current.codingPractice;
  const container = objectRecord(rawContainer);
  if (!key) return null;
  const rawRecord = container?.[key];
  const record = objectRecord(rawRecord) ?? {};
  const result = {
    current,
    container: container ? { ...container } : {},
    record: { ...record },
    malformedContainer: rawContainer !== undefined && !container ? rawContainer : undefined,
    malformedRecord: rawRecord !== undefined && !objectRecord(rawRecord) ? rawRecord : undefined,
  };
  return result;
}

function preserveMalformed(next, copied, key) {
  if (copied.malformedContainer !== undefined) next.codingPracticeMalformedBackup = copied.malformedContainer;
  if (copied.malformedRecord !== undefined) next.codingPractice[key] = { ...next.codingPractice[key], malformedRecordBackup: copied.malformedRecord };
  return next;
}

export function saveCodingNotes(progress, subjectId, topicId, problemId, notes, updatedAt = new Date().toISOString()) {
  const key = codingProblemKey(subjectId, topicId, problemId);
  const normalizedNotes = normalizeCodingNotes(notes);
  if (!key || !normalizedNotes || typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) return progress;
  const copied = copyRecord(progress, key);
  if (!copied) return progress;
  const record = copied.record;
  const rawNotes = record.notes;
  const next = {
    ...copied.current,
    codingPractice: {
      ...copied.container,
      [key]: {
        ...record,
        ...(rawNotes !== undefined && !normalizeCodingNotes(rawNotes) ? { notesMalformedBackup: rawNotes } : {}),
        notes: normalizedNotes,
        attempts: normalizeAttempts(record.attempts),
        notesUpdatedAt: new Date(updatedAt).toISOString(),
      },
    },
  };
  return preserveMalformed(next, copied, key);
}

export function appendCodingAttempt(progress, subjectId, topicId, problemId, attemptInput) {
  const key = codingProblemKey(subjectId, topicId, problemId);
  const attempt = normalizeCodingAttempt(attemptInput);
  if (!key || !attempt) return progress;
  const copied = copyRecord(progress, key);
  if (!copied) return progress;
  const existingAttempts = normalizeAttempts(copied.record.attempts);
  if (existingAttempts.some((entry) => entry.id === attempt.id)) return progress;
  const record = {
    ...copied.record,
    notes: normalizeCodingNotes(copied.record.notes) ?? normalizeCodingNotes({}),
    attempts: [attempt, ...existingAttempts].slice(0, CODING_ATTEMPTS_PER_PROBLEM_LIMIT),
    attemptCount: (Number.isInteger(copied.record.attemptCount) && copied.record.attemptCount >= existingAttempts.length
      ? copied.record.attemptCount : existingAttempts.length) + 1,
  };
  if (copied.record.attempts !== undefined && !Array.isArray(copied.record.attempts)) record.attemptsMalformedBackup = copied.record.attempts;

  const codingPractice = { ...copied.container, [key]: record };
  const allAttempts = Object.entries(codingPractice).flatMap(([recordKey, value]) => {
    const entry = objectRecord(value);
    return normalizeAttempts(entry?.attempts).map((saved) => ({ recordKey, id: saved.id, timestamp: saved.timestamp }));
  }).sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp) || right.id.localeCompare(left.id));
  const keep = new Set(allAttempts.slice(0, CODING_ATTEMPT_LIMIT).map((entry) => `${entry.recordKey}:${entry.id}`));
  for (const [recordKey, value] of Object.entries(codingPractice)) {
    const entry = objectRecord(value);
    if (!entry || !Array.isArray(entry.attempts)) continue;
    const attempts = normalizeAttempts(entry.attempts).filter((saved) => keep.has(`${recordKey}:${saved.id}`));
    codingPractice[recordKey] = { ...entry, attempts };
  }
  const next = { ...copied.current, codingPractice };
  return preserveMalformed(next, copied, key);
}

export function getNextIncompleteProblem(problems, currentProblemId, isComplete) {
  if (!Array.isArray(problems) || typeof isComplete !== "function") return null;
  const unique = [...new Map(problems.filter((problem) => typeof problem?.id === "string" && problem.id).map((problem) => [problem.id, problem])).values()];
  const currentIndex = unique.findIndex((problem) => problem.id === currentProblemId);
  if (currentIndex < 0 || unique.length < 2) return null;
  for (let offset = 1; offset < unique.length; offset += 1) {
    const candidate = unique[(currentIndex + offset) % unique.length];
    if (!isComplete(candidate.id)) return candidate;
  }
  return null;
}

export function getSafeCodingProblemUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
