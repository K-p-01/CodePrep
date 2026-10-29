import { buildRevisionQueue, localDateKey } from "./revisionQueue.js";
import { getEligibleQuestions, getSimulationHistory } from "./placementSimulation.js";
import { missionTaskDone, resolveMissionTask } from "../components/dashboard/dailyMission.js";

const MIN_TOPIC_ATTEMPTS = 3;

function readAttempt(progressApi, subjectId, topicId) {
  try {
    const fromApi = progressApi?.getMcqAttempt?.(subjectId, topicId);
    if (fromApi && typeof fromApi === "object" && !Array.isArray(fromApi)) return fromApi;
  } catch { /* malformed optional history is ignored */ }
  const stored = progressApi?.progress?.[`mcq:${subjectId}:${topicId}`];
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

function isTopicComplete(progressApi, subjectId, topicId) {
  try {
    if (typeof progressApi?.isTopicComplete === "function") return progressApi.isTopicComplete(subjectId, topicId) === true;
  } catch { /* use the existing persisted key as a safe fallback */ }
  return progressApi?.progress?.[`${subjectId}:${topicId}`] === true;
}

function isCodingComplete(progressApi, subjectId, topicId, problemId) {
  try {
    if (typeof progressApi?.isCodingProblemComplete === "function") return progressApi.isCodingProblemComplete(subjectId, topicId, problemId) === true;
  } catch { /* use the existing persisted key as a safe fallback */ }
  return progressApi?.progress?.[`coding:${subjectId}:${topicId}:${problemId}`] === true;
}

function validQuestion(question) {
  return typeof question?.id === "string" && question.id && Array.isArray(question.options) &&
    typeof question.correctAnswer === "string" && question.options.includes(question.correctAnswer);
}

function validSubmittedSimulation(attempt) {
  const result = attempt?.result;
  return typeof attempt?.submittedAt === "string" && Number.isFinite(Date.parse(attempt.submittedAt)) &&
    Number.isInteger(result?.total) && result.total > 0 && Number.isInteger(result.answered) &&
    Number.isInteger(result.correct) && result.correct >= 0 && result.correct <= result.answered &&
    result.answered <= result.total && Number.isFinite(result.scorePercent) && result.scorePercent >= 0 &&
    result.scorePercent <= 100 && result.scorePercent === Math.round((result.correct / result.total) * 100) &&
    Array.isArray(attempt.questionSnapshots);
}

function getSubmittedSimulations(progress) {
  return getSimulationHistory(progress).filter(validSubmittedSimulation);
}

function topicPath(subjectId, topicId, section = "overview") {
  return `/subjects/${subjectId}/topics/${topicId}#${section}`;
}

function makeMission(catalog, progressApi, now) {
  const mission = progressApi?.progress?.dailyMission;
  const today = localDateKey(now);
  if (!mission || mission.date !== today || !Array.isArray(mission.tasks)) return null;
  const tasks = mission.tasks.map((task) => ({ task, resolved: resolveMissionTask(task, catalog) }))
    .filter(({ resolved }) => resolved.available);
  const completed = tasks.filter(({ task, resolved }) => {
    try { return missionTaskDone(task, resolved, progressApi, mission.completedTaskIds); }
    catch { return false; }
  }).length;
  return { date: today, completed, total: tasks.length, duration: Number.isFinite(mission.duration) ? mission.duration : null };
}

function buildTopicMetrics(catalog, progressApi, simulations) {
  const topicMetrics = [];
  const validQuestionsByTopic = new Map();
  const responsesByTopic = new Map();
  const simulationMistakes = new Map();

  const addResponse = (key, response) => {
    if (!responsesByTopic.has(key)) responsesByTopic.set(key, []);
    responsesByTopic.get(key).push(response);
  };

  for (const subject of catalog) {
    if (!subject?.id || !Array.isArray(subject.topics)) continue;
    const seenTopics = new Set();
    for (const topic of subject.topics) {
      if (!topic?.id || seenTopics.has(topic.id)) continue;
      seenTopics.add(topic.id);
      const key = `${subject.id}:${topic.id}`;
      const questions = [...new Map((Array.isArray(topic.practice?.questions) ? topic.practice.questions : [])
        .filter(validQuestion).map((question) => [question.id, question])).values()];
      validQuestionsByTopic.set(key, new Map(questions.map((question) => [question.id, question])));
      const answers = readAttempt(progressApi, subject.id, topic.id).answers;
      if (answers && typeof answers === "object" && !Array.isArray(answers)) {
        for (const question of questions) {
          const answer = answers[question.id];
          if (typeof answer?.selectedAnswer !== "string" || !question.options.includes(answer.selectedAnswer)) continue;
          addResponse(key, { questionId: question.id, correct: answer.selectedAnswer === question.correctAnswer, source: "practice" });
        }
      }
    }
  }

  for (const attempt of simulations) {
    const seenInAttempt = new Set();
    for (const snapshot of attempt.questionSnapshots) {
      const { subjectId, topicId, questionId, status, selectedAnswer, correctAnswer } = snapshot ?? {};
      const key = `${subjectId}:${topicId}`;
      const question = validQuestionsByTopic.get(key)?.get(questionId);
      if (!question || seenInAttempt.has(`${key}:${questionId}`) ||
          !["correct", "incorrect"].includes(status) || !question.options.includes(selectedAnswer) ||
          (selectedAnswer === correctAnswer) !== (status === "correct")) continue;
      seenInAttempt.add(`${key}:${questionId}`);
      addResponse(key, { questionId, correct: status === "correct", source: "simulation", attemptId: attempt.id });
      if (status === "incorrect") {
        const errorKey = `${key}:${questionId}`;
        if (!simulationMistakes.has(errorKey)) simulationMistakes.set(errorKey, { subjectId, topicId, questionId, question, attemptIds: new Set() });
        simulationMistakes.get(errorKey).attemptIds.add(attempt.id);
      }
    }
  }

  for (const subject of catalog) {
    if (!subject?.id || !Array.isArray(subject.topics)) continue;
    const seenTopics = new Set();
    for (const topic of subject.topics) {
      if (!topic?.id || seenTopics.has(topic.id)) continue;
      seenTopics.add(topic.id);
      const key = `${subject.id}:${topic.id}`;
      const questions = validQuestionsByTopic.get(key) ?? new Map();
      const problems = [...new Map((Array.isArray(topic.practice?.problems) ? topic.practice.problems : [])
        .filter((problem) => typeof problem?.id === "string" && problem.id).map((problem) => [problem.id, problem])).values()];
      const completedProblems = problems.filter((problem) => isCodingComplete(progressApi, subject.id, topic.id, problem.id)).length;
      const responses = responsesByTopic.get(key) ?? [];
      const correct = responses.filter((response) => response.correct).length;
      const complete = isTopicComplete(progressApi, subject.id, topic.id);
      let status = complete ? "completed" : responses.length || completedProblems ? "inProgress" : "notStarted";
      try {
        const resolvedStatus = progressApi?.getTopicStatus?.(subject, topic)?.id;
        if (["completed", "inProgress", "notStarted"].includes(resolvedStatus)) status = resolvedStatus;
      } catch { /* derived from validated progress records above */ }
      const practiceTotal = questions.size + problems.length;
      const practiceDone = responses.length > 0 ? new Set(responses.map((response) => response.questionId)).size : 0;
      const practiceCompleted = Math.min(questions.size, practiceDone) + completedProblems;
      topicMetrics.push({
        subject, topic, status,
        completed: complete,
        practiceCompleted,
        practiceTotal,
        practicePercent: practiceTotal ? Math.round((practiceCompleted / practiceTotal) * 100) : null,
        completedProblems,
        totalProblems: problems.length,
        answered: responses.length,
        correct,
        accuracy: responses.length ? Math.round((correct / responses.length) * 100) : null,
        practiceAnswers: responses.filter((response) => response.source === "practice").length,
        simulationAnswers: responses.filter((response) => response.source === "simulation").length,
      });
    }
  }

  const repeatedErrors = [...simulationMistakes.values()]
    .filter((mistake) => mistake.attemptIds.size >= 2)
    .map((mistake) => ({ ...mistake, attempts: mistake.attemptIds.size }))
    .sort((left, right) => right.attempts - left.attempts || String(left.question.prompt ?? "").localeCompare(String(right.question.prompt ?? "")));

  return { topicMetrics, repeatedErrors };
}

function buildRecommendations({ catalog, topicMetrics, repeatedErrors, revisionItems, simulations }) {
  const recommendations = [];
  const usedHrefs = new Set();
  const usedTopics = new Set();
  const add = (recommendation) => {
    if (!recommendation?.href || usedHrefs.has(recommendation.href)) return false;
    if (recommendation.topicKey && usedTopics.has(recommendation.topicKey)) return false;
    recommendations.push(recommendation);
    usedHrefs.add(recommendation.href);
    if (recommendation.topicKey) usedTopics.add(recommendation.topicKey);
    return true;
  };
  const available = topicMetrics.filter((item) => item.topic && item.subject?.id);

  const overdue = revisionItems.filter((entry) => entry.available && entry.schedule && entry.dueStatus === "overdue");
  if (overdue.length) add({
    id: "overdue-revision", title: `Review ${overdue.length} overdue ${overdue.length === 1 ? "item" : "items"}`,
    reason: "These saved revision schedules are past their due dates.", href: "/revision", priority: "urgent", weight: 100,
  });

  const today = revisionItems.filter((entry) => entry.available && entry.schedule && entry.dueStatus === "dueToday");
  if (today.length) add({
    id: "due-revision", title: `Complete ${today.length} scheduled review${today.length === 1 ? "" : "s"}`,
    reason: "These revision schedules are due today.", href: "/revision", priority: "high", weight: 85,
  });

  for (const error of repeatedErrors) {
    const metric = available.find((item) => item.subject.id === error.subjectId && item.topic.id === error.topicId);
    if (!metric) continue;
    add({
      id: `repeat-error:${error.subjectId}:${error.topicId}:${error.questionId}`,
      title: `Revisit ${metric.topic.title}`,
      reason: `The same question was answered incorrectly in ${error.attempts} submitted simulations.`,
      href: topicPath(metric.subject.id, metric.topic.id, "practice"), priority: "high", weight: 90,
      topicKey: `${metric.subject.id}:${metric.topic.id}`,
    });
  }

  const weakTopics = available.filter((item) => item.answered >= MIN_TOPIC_ATTEMPTS && item.accuracy <= 60)
    .sort((left, right) => left.accuracy - right.accuracy || right.answered - left.answered || left.topic.order - right.topic.order);
  for (const item of weakTopics) add({
    id: `weak-topic:${item.subject.id}:${item.topic.id}`,
    title: `Practice ${item.topic.title} again`,
    reason: `${item.accuracy}% across ${item.answered} recorded MCQ answers (minimum ${MIN_TOPIC_ATTEMPTS} for this signal).`,
    href: topicPath(item.subject.id, item.topic.id, "practice"), priority: item.accuracy <= 40 ? "high" : "medium", weight: 80 - item.accuracy / 10,
    topicKey: `${item.subject.id}:${item.topic.id}`,
  });

  const catalogOrder = new Map(catalog.map((subject, index) => [subject.id, index]));
  const incomplete = [...available].filter((item) => !item.completed)
    .sort((left, right) => (catalogOrder.get(left.subject.id) ?? 0) - (catalogOrder.get(right.subject.id) ?? 0) || (left.topic.order ?? 0) - (right.topic.order ?? 0));
  for (const item of incomplete) {
    if (add({
      id: `next-topic:${item.subject.id}:${item.topic.id}`,
      title: `Continue with ${item.topic.title}`,
      reason: `It is an incomplete topic in ${item.subject.name}'s ordered roadmap.`,
      href: topicPath(item.subject.id, item.topic.id), priority: "medium", weight: 60,
      topicKey: `${item.subject.id}:${item.topic.id}`,
    })) break;
  }

  const hasDiagnosticPool = getEligibleQuestions(catalog, "full-placement").length > 0;
  if (hasDiagnosticPool) add({
    id: "diagnostic-simulation", title: "Take a placement baseline",
    reason: simulations.length
      ? "A fresh submitted assessment can show how your latest result compares with the previous attempt."
      : "No reliable topic weakness is established yet; a submitted mixed assessment can provide a baseline.",
    href: "/simulation", priority: "baseline", weight: 40,
  });

  const practiceTopics = available.filter((item) => (item.topic.practice?.questions?.length ?? 0) + (item.topic.practice?.problems?.length ?? 0) > 0)
    .sort((left, right) => left.subject.id.localeCompare(right.subject.id) || (left.topic.order ?? 0) - (right.topic.order ?? 0));
  for (const item of practiceTopics) add({
    id: `practice-topic:${item.subject.id}:${item.topic.id}`,
    title: `Try a practice set in ${item.topic.title}`,
    reason: "This topic has available practice content; the suggestion does not assume a weakness.",
    href: topicPath(item.subject.id, item.topic.id, "practice"), priority: "baseline", weight: 30,
    topicKey: `${item.subject.id}:${item.topic.id}`,
  });

  if (recommendations.length < 3 && catalog.length) add({
    id: "browse-roadmaps", title: "Explore the subject roadmaps",
    reason: "Choose a subject and follow its topics in the catalog order.", href: "/subjects", priority: "baseline", weight: 10,
  });
  return recommendations.sort((left, right) => right.weight - left.weight).slice(0, 3)
    .map(({ weight, topicKey, ...recommendation }) => recommendation);
}

export function buildReadinessReport(catalogInput, progressApi, now = new Date()) {
  const catalog = Array.isArray(catalogInput) ? catalogInput : [];
  const simulations = getSubmittedSimulations(progressApi?.progress);
  const { topicMetrics, repeatedErrors } = buildTopicMetrics(catalog, progressApi, simulations);
  const completedTopics = topicMetrics.filter((item) => item.completed).length;
  const completedCodingProblems = topicMetrics.reduce((sum, item) => sum + item.completedProblems, 0);
  const totalCodingProblems = topicMetrics.reduce((sum, item) => sum + item.totalProblems, 0);
  const mcqAnswered = topicMetrics.reduce((sum, item) => sum + item.answered, 0);
  const mcqCorrect = topicMetrics.reduce((sum, item) => sum + item.correct, 0);
  let revisionItems = [];
  try { revisionItems = buildRevisionQueue(catalog, progressApi, now).filter((item) => item && typeof item === "object"); }
  catch { /* malformed optional revision data does not block the coach */ }
  const availableRevisionItems = revisionItems.filter((item) => item.available);
  const scheduledItems = availableRevisionItems.filter((item) => item.schedule);
  const report = {
    topicCoverage: {
      completed: completedTopics,
      total: topicMetrics.length,
      percent: topicMetrics.length ? Math.round(completedTopics / topicMetrics.length * 100) : null,
    },
    practice: {
      completedCodingProblems,
      totalCodingProblems,
      answeredMcqs: mcqAnswered,
      correctMcqs: mcqCorrect,
      accuracy: mcqAnswered ? Math.round(mcqCorrect / mcqAnswered * 100) : null,
    },
    topicMetrics,
    strengths: topicMetrics.filter((item) => item.answered >= MIN_TOPIC_ATTEMPTS && item.accuracy >= 80)
      .sort((left, right) => right.accuracy - left.accuracy || right.answered - left.answered).slice(0, 4),
    improvementAreas: topicMetrics.filter((item) => item.answered >= MIN_TOPIC_ATTEMPTS && item.accuracy <= 60)
      .sort((left, right) => left.accuracy - right.accuracy || right.answered - left.answered).slice(0, 4),
    repeatedErrors,
    simulations: simulations.slice(0, 5),
    revision: {
      total: availableRevisionItems.length,
      overdue: scheduledItems.filter((item) => item.dueStatus === "overdue").length,
      dueToday: scheduledItems.filter((item) => item.dueStatus === "dueToday").length,
      unscheduled: availableRevisionItems.filter((item) => !item.schedule).length,
    },
    mission: makeMission(catalog, progressApi, now),
  };
  report.recommendations = buildRecommendations({ catalog, topicMetrics, repeatedErrors, revisionItems: availableRevisionItems, simulations });
  return report;
}

export { MIN_TOPIC_ATTEMPTS, topicPath };
