import { describe, expect, it } from "vitest";
import { addLocalDays, localDateKey, revisionItemKey } from "../src/data/revisionQueue.js";
import { buildReadinessReport, MIN_TOPIC_ATTEMPTS } from "../src/data/readinessCoach.js";

const questionSet = (prefix) => [0, 1, 2, 3].map((index) => ({
  id: `${prefix}-${index + 1}`,
  prompt: `${prefix} question ${index + 1}`,
  options: ["A", "B"],
  correctAnswer: "A",
  explanation: "A is correct.",
}));

const catalog = [
  { id: "dsa", name: "DSA", topics: [
    { id: "arrays", title: "Arrays", order: 1, practice: { questions: questionSet("array"), problems: [{ id: "two-sum", title: "Two Sum" }] } },
    { id: "graphs", title: "Graphs", order: 2, practice: { questions: questionSet("graph"), problems: [] } },
  ] },
];

function makeApi(progress = {}) {
  return {
    progress,
    isTopicComplete: (subjectId, topicId) => progress[`${subjectId}:${topicId}`] === true,
    isCodingProblemComplete: (subjectId, topicId, problemId) => progress[`coding:${subjectId}:${topicId}:${problemId}`] === true,
    getMcqAttempt: (subjectId, topicId) => progress[`mcq:${subjectId}:${topicId}`] ?? { answers: {} },
    getTopicStatus: (subject, topic) => {
      if (progress[`${subject.id}:${topic.id}`]) return { id: "completed" };
      const answers = progress[`mcq:${subject.id}:${topic.id}`]?.answers ?? {};
      const active = Object.keys(answers).length > 0 || progress[`coding:${subject.id}:${topic.id}:two-sum`];
      return { id: active ? "inProgress" : "notStarted" };
    },
  };
}

function submittedSimulation({ id, questionId, selectedAnswer = "B", submittedAt = "2026-10-29T10:00:00.000Z" }) {
  const correct = selectedAnswer === "A";
  return {
    id,
    submittedAt,
    config: { focusLabel: "Full Placement" },
    result: { total: 1, answered: 1, correct: Number(correct), incorrect: Number(!correct), scorePercent: correct ? 100 : 0, sections: [] },
    questionSnapshots: [{ subjectId: "dsa", topicId: "arrays", questionId, selectedAnswer, correctAnswer: "A", status: correct ? "correct" : "incorrect" }],
  };
}

describe("Personalized readiness report", () => {
  it("returns a clear zero-activity state without inventing accuracy or strengths", () => {
    const report = buildReadinessReport(catalog, makeApi(), new Date(2026, 9, 29));
    expect(report.topicCoverage).toEqual({ completed: 0, total: 2, percent: 0 });
    expect(report.practice.accuracy).toBeNull();
    expect(report.practice.answeredMcqs).toBe(0);
    expect(report.strengths).toEqual([]);
    expect(report.improvementAreas).toEqual([]);
    expect(report.simulations).toEqual([]);
    expect(report.mission).toBeNull();
    expect(report.recommendations).toHaveLength(3);
    expect(report.recommendations.some((action) => action.id === "diagnostic-simulation")).toBe(true);
  });

  it("calculates topic coverage and MCQ accuracy from valid stored answers only", () => {
    const progress = {
      "dsa:arrays": true,
      "mcq:dsa:arrays": { answers: {
        "array-1": { selectedAnswer: "A" },
        "array-2": { selectedAnswer: "B" },
        "array-3": { selectedAnswer: "not-an-option" },
        "opened-only": { selectedAnswer: "A" },
      } },
      "coding:dsa:arrays:two-sum": true,
    };
    const report = buildReadinessReport(catalog, makeApi(progress));
    const arrays = report.topicMetrics.find((topic) => topic.topic.id === "arrays");
    expect(report.topicCoverage).toEqual({ completed: 1, total: 2, percent: 50 });
    expect(arrays.answered).toBe(2);
    expect(arrays.correct).toBe(1);
    expect(arrays.accuracy).toBe(50);
    expect(arrays.completedProblems).toBe(1);
    expect(report.practice.accuracy).toBe(50);
  });

  it("distinguishes absent performance from supported weak and strong performance", () => {
    const answers = Object.fromEntries(questionSet("array").slice(0, MIN_TOPIC_ATTEMPTS).map((question, index) => [question.id, { selectedAnswer: index === 0 ? "A" : "B" }]));
    const report = buildReadinessReport(catalog, makeApi({ "mcq:dsa:arrays": { answers } }));
    expect(report.topicMetrics.find((item) => item.topic.id === "graphs").accuracy).toBeNull();
    expect(report.improvementAreas.map((item) => item.topic.id)).toContain("arrays");
    expect(report.strengths).toEqual([]);

    const strongAnswers = Object.fromEntries(questionSet("graph").slice(0, MIN_TOPIC_ATTEMPTS).map((question) => [question.id, { selectedAnswer: "A" }]));
    const strongReport = buildReadinessReport(catalog, makeApi({ "mcq:dsa:graphs": { answers: strongAnswers } }));
    expect(strongReport.strengths.map((item) => item.topic.id)).toContain("graphs");
  });

  it("prioritizes overdue reviews, then repeated simulation errors, without duplicate topic actions", () => {
    const now = new Date(2026, 9, 29);
    const saved = { type: "topic", subjectId: "dsa", topicId: "graphs", itemId: "graphs" };
    const key = revisionItemKey(saved);
    const progress = {
      savedItems: [saved],
      revisionSchedules: { [key]: { dueDate: addLocalDays(localDateKey(now), -2), stage: 1, reviewCount: 2 } },
      placementSimulation: { recentAttempts: [
        submittedSimulation({ id: "sim-1", questionId: "array-1" }),
        submittedSimulation({ id: "sim-2", questionId: "array-1", submittedAt: "2026-10-28T10:00:00.000Z" }),
      ] },
    };
    const report = buildReadinessReport(catalog, makeApi(progress), now);
    expect(report.revision.overdue).toBe(1);
    expect(report.repeatedErrors).toHaveLength(1);
    expect(report.recommendations[0].id).toBe("overdue-revision");
    expect(report.recommendations[1].id).toBe("repeat-error:dsa:arrays:array-1");
    const topicDestinations = report.recommendations.map((item) => item.href).filter((href) => href.includes("/topics/"));
    expect(new Set(topicDestinations).size).toBe(topicDestinations.length);
  });

  it("uses scheduled due dates and does not count unscheduled saved items as overdue", () => {
    const now = new Date(2026, 9, 29);
    const overdue = { type: "topic", subjectId: "dsa", topicId: "arrays", itemId: "arrays" };
    const today = { type: "topic", subjectId: "dsa", topicId: "graphs", itemId: "graphs" };
    const unscheduled = { type: "coding", subjectId: "dsa", topicId: "arrays", itemId: "two-sum" };
    const progress = {
      savedItems: [overdue, today, unscheduled],
      revisionSchedules: {
        [revisionItemKey(overdue)]: { dueDate: addLocalDays(localDateKey(now), -1), stage: 0, reviewCount: 1 },
        [revisionItemKey(today)]: { dueDate: localDateKey(now), stage: 0, reviewCount: 1 },
      },
    };
    const report = buildReadinessReport(catalog, makeApi(progress), now);
    expect(report.revision).toMatchObject({ overdue: 1, dueToday: 1, unscheduled: 1 });
    expect(report.recommendations[0].id).toBe("overdue-revision");
    const dueOnlyReport = buildReadinessReport(catalog, makeApi({ savedItems: [today], revisionSchedules: {
      [revisionItemKey(today)]: { dueDate: localDateKey(now), stage: 0, reviewCount: 1 },
    } }), now);
    expect(dueOnlyReport.recommendations[0]).toMatchObject({ id: "due-revision", priority: "high" });
  });

  it("derives today's mission completion from the current saved mission", () => {
    const now = new Date(2026, 9, 29);
    const report = buildReadinessReport(catalog, makeApi({ dailyMission: {
      date: localDateKey(now), duration: 20,
      tasks: [{ id: "learn-arrays", type: "learn", targetType: "topic", subjectId: "dsa", topicId: "arrays" }],
      completedTaskIds: ["learn-arrays"],
    } }), now);
    expect(report.mission).toEqual({ date: localDateKey(now), completed: 1, total: 1, duration: 20 });
  });

  it("shows scores only for valid submitted attempts, never an active draft", () => {
    const valid = submittedSimulation({ id: "submitted", questionId: "array-1", selectedAnswer: "A" });
    const activeOnly = { id: "active", answers: {}, questionRefs: [] };
    const malformed = { ...submittedSimulation({ id: "bad", questionId: "array-1" }), submittedAt: "not-a-date" };
    const report = buildReadinessReport(catalog, makeApi({ placementSimulation: { activeAttempt: activeOnly, recentAttempts: [valid, malformed] } }));
    expect(report.simulations).toHaveLength(1);
    expect(report.simulations[0]).toMatchObject({ id: "submitted", result: { scorePercent: 100 } });
  });

  it("keeps recommendation destinations within existing application routes", () => {
    const report = buildReadinessReport(catalog, makeApi());
    for (const recommendation of report.recommendations) {
      expect(["/revision", "/simulation", "/subjects", ...catalog.flatMap((subject) => subject.topics.map((topic) => `/subjects/${subject.id}/topics/${topic.id}#overview`)), ...catalog.flatMap((subject) => subject.topics.map((topic) => `/subjects/${subject.id}/topics/${topic.id}#practice`))]).toContain(recommendation.href);
      expect(recommendation.title).toBeTruthy();
      expect(recommendation.reason).toBeTruthy();
      expect(["urgent", "high", "medium", "baseline"]).toContain(recommendation.priority);
    }
    expect(new Set(report.recommendations.map((item) => item.href)).size).toBe(report.recommendations.length);
  });

  it("ignores malformed optional histories and returns a safe report", () => {
    const api = makeApi({
      placementSimulation: { recentAttempts: [{ id: "partial", result: { scorePercent: 99 }, questionSnapshots: [] }] },
      revisionSchedules: "bad-shape",
      savedItems: [{ type: "resource", subjectId: "missing", topicId: "missing", itemId: "gone" }],
      dailyMission: { date: "2026-10-29", tasks: "not-an-array" },
      "mcq:dsa:arrays": { answers: [null, { selectedAnswer: 3 }] },
    });
    expect(() => buildReadinessReport(catalog, api, new Date(2026, 9, 29))).not.toThrow();
    const report = buildReadinessReport(catalog, api, new Date(2026, 9, 29));
    expect(report.simulations).toEqual([]);
    expect(report.mission).toBeNull();
    expect(report.practice.accuracy).toBeNull();
    expect(report.revision.overdue).toBe(0);
  });
});
