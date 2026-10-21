export const SIMULATION_DURATIONS = [15, 30, 45];
export const SIMULATION_HISTORY_LIMIT = 10;

export const SIMULATION_FOCUS_PRESETS = [
  { id: "full-placement", label: "Full Placement", subjectIds: null },
  { id: "core-cs", label: "Core CS", subjectIds: ["dbms", "os", "cn", "oop"] },
  { id: "aptitude", label: "Aptitude", subjectIds: ["aptitude"] },
  { id: "interview-prep", label: "Interview Preparation", subjectIds: ["interview-prep"] },
];

export function simulationQuestionKey(ref) {
  return JSON.stringify([ref.subjectId, ref.topicId, ref.questionId]);
}

export function simulationCodingKey(ref) {
  return JSON.stringify([ref.subjectId, ref.topicId, ref.problemId]);
}

export function getEligibleQuestions(catalog, focusId) {
  const preset = SIMULATION_FOCUS_PRESETS.find((focus) => focus.id === focusId);
  const subjectIds = preset ? preset.subjectIds : [focusId.startsWith("subject:") ? focusId.slice("subject:".length) : focusId];
  const selectedSubjects = (Array.isArray(catalog) ? catalog : []).filter((subject) => !subjectIds || subjectIds.includes(subject.id));
  const seen = new Set();
  return selectedSubjects.flatMap((subject) => (Array.isArray(subject.topics) ? subject.topics : []).flatMap((topic) =>
    (Array.isArray(topic.practice?.questions) ? topic.practice.questions : []).flatMap((question) => {
      if (typeof question?.id !== "string" || !question.id || typeof question.prompt !== "string" || !question.prompt.trim() ||
          !Array.isArray(question.options) || !question.options.length || question.options.some((option) => typeof option !== "string") ||
          typeof question.correctAnswer !== "string" || !question.options.includes(question.correctAnswer)) return [];
      const ref = { subjectId: subject.id, topicId: topic.id, questionId: question.id };
      const key = simulationQuestionKey(ref);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ ...ref, key, subject, topic, question }];
    }),
  ));
}

export function getSimulationQuestionCountOptions(poolSize) {
  if (!Number.isInteger(poolSize) || poolSize <= 0) return [];
  const common = [10, 20, 30].filter((count) => count <= poolSize);
  if (poolSize < 10) return [poolSize];
  if (poolSize < 30 && !common.includes(poolSize)) common.push(poolSize);
  return common;
}

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function selectSimulationQuestions(pool, requestedCount, random = Math.random) {
  const count = Math.max(0, Math.min(Number.isInteger(requestedCount) ? requestedCount : 0, pool.length));
  const buckets = new Map();
  for (const entry of pool) {
    if (!buckets.has(entry.subjectId)) buckets.set(entry.subjectId, []);
    buckets.get(entry.subjectId).push(entry);
  }
  const subjectOrder = shuffled([...buckets.keys()], random);
  const orderedBuckets = subjectOrder.map((subjectId) => shuffled(buckets.get(subjectId), random));
  const result = [];
  while (result.length < count) {
    let added = false;
    for (const bucket of orderedBuckets) {
      if (bucket.length && result.length < count) {
        result.push(bucket.shift());
        added = true;
      }
    }
    if (!added) break;
  }
  return result;
}

export function getEligibleCodingProblems(catalog) {
  const dsa = catalog.find((subject) => subject.id === "dsa");
  if (!dsa) return [];
  const seen = new Set();
  return (dsa.topics ?? []).flatMap((topic) => (topic.practice?.problems ?? []).flatMap((problem) => {
    if (!problem?.id || typeof problem.title !== "string") return [];
    let url;
    try { url = new URL(problem.url); } catch { return []; }
    if (!new Set(["http:", "https:"]).has(url.protocol)) return [];
    const ref = { subjectId: dsa.id, topicId: topic.id, problemId: problem.id };
    const key = simulationCodingKey(ref);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...ref, key, subject: dsa, topic, problem, url: url.href }];
  }));
}

export function selectSimulationCodingProblems(pool, requestedCount = 3, random = Math.random) {
  const unique = [...new Map(pool.map((entry) => [entry.key, entry])).values()];
  return shuffled(unique, random).slice(0, Math.max(0, Math.min(requestedCount, unique.length)));
}

export function createSimulationAttempt({ config, questions, codingProblems = [], now = Date.now(), randomId = () => globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}` }) {
  const durationMinutes = SIMULATION_DURATIONS.includes(Number(config.durationMinutes)) ? Number(config.durationMinutes) : null;
  const distinctQuestions = [...new Map(questions.map((entry) => [entry.key, entry])).values()];
  if (!durationMinutes || !distinctQuestions.length) return null;
  const id = randomId();
  const codingRefs = [...new Map(codingProblems.map((entry) => [entry.key, entry])).values()];
  return {
    id,
    config: {
      focusId: config.focusId,
      focusLabel: config.focusLabel,
      durationMinutes,
      questionCount: distinctQuestions.length,
      includeCodingRound: codingRefs.length > 0,
    },
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + durationMinutes * 60_000).toISOString(),
    questionRefs: distinctQuestions.map(({ subjectId, topicId, questionId }) => ({ subjectId, topicId, questionId })),
    answers: {},
    markedForReview: {},
    codingRefs: codingRefs.map(({ subjectId, topicId, problemId }) => ({ subjectId, topicId, problemId })),
    codingAttempts: Object.fromEntries(codingRefs.map((entry) => [entry.key, false])),
    currentIndex: 0,
  };
}

export function getRemainingSeconds(expiresAt, now = Date.now()) {
  const expiry = typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) return 0;
  return Math.max(0, Math.ceil((expiry - now) / 1000));
}

export function isValidActiveSimulation(attempt) {
  if (!attempt || typeof attempt !== "object" || Array.isArray(attempt) || typeof attempt.id !== "string" || !attempt.id ||
      !attempt.config || typeof attempt.config.focusId !== "string" || typeof attempt.config.focusLabel !== "string" || !SIMULATION_DURATIONS.includes(attempt.config.durationMinutes) || !Array.isArray(attempt.questionRefs) || !attempt.questionRefs.length ||
      !Number.isFinite(Date.parse(attempt.startedAt)) || !Number.isFinite(Date.parse(attempt.expiresAt))) return false;
  const validRefs = attempt.questionRefs.every((ref) => ref && typeof ref.subjectId === "string" && ref.subjectId && typeof ref.topicId === "string" && ref.topicId && typeof ref.questionId === "string" && ref.questionId);
  if (!validRefs) return false;
  const keys = attempt.questionRefs.map(simulationQuestionKey);
  return validRefs && new Set(keys).size === keys.length &&
    attempt.answers && typeof attempt.answers === "object" && !Array.isArray(attempt.answers) &&
    attempt.markedForReview && typeof attempt.markedForReview === "object" && !Array.isArray(attempt.markedForReview) &&
    Array.isArray(attempt.codingRefs) && attempt.codingRefs.every((ref) => ref && typeof ref.subjectId === "string" && ref.subjectId && typeof ref.topicId === "string" && ref.topicId && typeof ref.problemId === "string" && ref.problemId) &&
    new Set(attempt.codingRefs.map(simulationCodingKey)).size === attempt.codingRefs.length &&
    attempt.codingAttempts && typeof attempt.codingAttempts === "object" && !Array.isArray(attempt.codingAttempts) &&
    Number.isInteger(attempt.currentIndex) && attempt.currentIndex >= 0 && attempt.currentIndex < attempt.questionRefs.length;
}

export function updateSimulationAttempt(attempt, patch) {
  if (!isValidActiveSimulation(attempt) || !patch || typeof patch !== "object" || Array.isArray(patch)) return attempt;
  return { ...attempt, ...patch, id: attempt.id, config: attempt.config, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, questionRefs: attempt.questionRefs, codingRefs: attempt.codingRefs };
}

export function calculateSimulationResult(attempt, catalog, submittedAt = new Date().toISOString(), submitReason = "manual") {
  const subjects = Array.isArray(catalog) ? catalog : [];
  const questionCatalog = new Map();
  for (const subject of subjects) for (const topic of subject.topics ?? []) for (const question of topic.practice?.questions ?? []) {
    const ref = { subjectId: subject.id, topicId: topic.id, questionId: question.id };
    questionCatalog.set(simulationQuestionKey(ref), { subject, topic, question });
  }
  const keys = [...new Set(attempt.questionRefs.map(simulationQuestionKey))];
  const sectionMap = new Map();
  const questionSnapshots = keys.map((key) => {
    const ref = attempt.questionRefs.find((entry) => simulationQuestionKey(entry) === key);
    const available = questionCatalog.get(key);
    const question = available?.question;
    const selectedAnswer = attempt.answers?.[key];
    const answered = Boolean(question && Array.isArray(question.options) && question.options.includes(selectedAnswer));
    const validCorrect = Boolean(question && typeof question.correctAnswer === "string" && question.options?.includes(question.correctAnswer));
    const correct = answered && validCorrect && selectedAnswer === question.correctAnswer;
    const subjectName = available?.subject?.name ?? ref.subjectId;
    const topicTitle = available?.topic?.title ?? ref.topicId;
    const entry = sectionMap.get(ref.subjectId) ?? { subjectId: ref.subjectId, subjectName, total: 0, answered: 0, correct: 0 };
    entry.total += 1;
    if (answered) entry.answered += 1;
    if (correct) entry.correct += 1;
    sectionMap.set(ref.subjectId, entry);
    return {
      ...ref,
      subjectName,
      topicTitle,
      prompt: question?.prompt ?? "Question unavailable in the current catalog",
      options: Array.isArray(question?.options) ? question.options : [],
      selectedAnswer: answered ? selectedAnswer : null,
      correctAnswer: validCorrect ? question.correctAnswer : null,
      explanation: question?.explanation ?? "No explanation is available for this question.",
      status: !question || !validCorrect ? "unavailable" : !answered ? "unanswered" : correct ? "correct" : "incorrect",
    };
  });
  const total = questionSnapshots.length;
  const answered = questionSnapshots.filter((entry) => entry.status === "correct" || entry.status === "incorrect").length;
  const correct = questionSnapshots.filter((entry) => entry.status === "correct").length;
  const sections = [...sectionMap.values()].map((section) => ({
    ...section,
    unanswered: section.total - section.answered,
    incorrect: section.total - section.correct,
    scorePercent: section.total ? Math.round((section.correct / section.total) * 100) : 0,
  }));
  const codingItems = (attempt.codingRefs ?? []).map((ref) => {
    const dsa = subjects.find((subject) => subject.id === ref.subjectId);
    const topic = dsa?.topics?.find((entry) => entry.id === ref.topicId);
    const problem = topic?.practice?.problems?.find((entry) => entry.id === ref.problemId);
    const key = simulationCodingKey(ref);
    let url = null;
    try { const parsed = new URL(problem?.url); if (["http:", "https:"].includes(parsed.protocol)) url = parsed.href; } catch { /* unavailable link */ }
    return { ...ref, title: problem?.title ?? "Coding problem unavailable", difficulty: problem?.difficulty ?? "—", platform: problem?.platform ?? "External site", url, attempted: attempt.codingAttempts?.[key] === true };
  });
  return {
    id: attempt.id,
    config: attempt.config,
    startedAt: attempt.startedAt,
    submittedAt,
    submitReason,
    result: { total, answered, unanswered: total - answered, correct, incorrect: total - correct, scorePercent: total ? Math.round((correct / total) * 100) : 0, sections },
    questionSnapshots,
    codingRound: { included: codingItems.length > 0, total: codingItems.length, attempted: codingItems.filter((item) => item.attempted).length, items: codingItems },
  };
}

export function getSimulationHistory(progress) {
  const metadata = progress?.placementSimulation ?? progress;
  const history = metadata?.recentAttempts;
  return Array.isArray(history) ? history.filter((attempt) => attempt && typeof attempt.id === "string" && attempt.result &&
    Number.isFinite(attempt.result.total) && Number.isFinite(attempt.result.answered) && Number.isFinite(attempt.result.correct) &&
    Number.isFinite(attempt.result.scorePercent) && Array.isArray(attempt.result.sections) && Array.isArray(attempt.questionSnapshots)).slice(0, SIMULATION_HISTORY_LIMIT) : [];
}

export function recordSimulationSubmission(metadata, result) {
  if (!metadata || typeof metadata !== "object" || !result || typeof result.id !== "string" || metadata.activeAttempt?.id !== result.id) return metadata;
  const validHistory = Array.isArray(metadata.recentAttempts);
  const previous = validHistory ? metadata.recentAttempts : [];
  if (previous.some((entry) => entry?.id === result.id)) return metadata;
  return {
    ...metadata,
    ...(metadata.recentAttempts !== undefined && !validHistory ? { recentAttemptsMalformedBackup: metadata.recentAttempts } : {}),
    activeAttempt: null,
    recentAttempts: [result, ...previous].slice(0, SIMULATION_HISTORY_LIMIT),
  };
}
