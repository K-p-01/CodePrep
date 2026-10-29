import { describe, expect, it } from "vitest";
import { buildLearningAnalytics, getSubjectAnalytics } from "../src/data/learningAnalytics.js";
import { createActivityEvent } from "../src/data/activityHistory.js";

const sampleCatalog = [{ id: "dsa", name: "DSA", fullName: "Data Structures and Algorithms", topics: [
  { id: "arrays", title: "Arrays", order: 1, practice: { questions: [{ id: "q1", options: ["A", "B"], correctAnswer: "A" }], problems: [{ id: "p1" }] } },
  { id: "graphs", title: "Graphs", order: 2, practice: { questions: [{ id: "q2", options: ["A", "B"], correctAnswer: "A" }], problems: [] } },
] }];

function makeApi(progress = {}) {
  return {
    progress,
    getStudySummary: () => ({ totalTopics: 2, completedTopics: progress["dsa:arrays"] ? 1 : 0, totalCodingProblems: 1, completedCodingProblems: progress["coding:dsa:arrays:p1"] ? 1 : 0, answeredQuestions: 1, correctAnswers: 1, mcqAccuracy: 100 }),
    getSubjectProgress: () => ({ totalTopics: 2, completedTopics: progress["dsa:arrays"] ? 1 : 0, percent: progress["dsa:arrays"] ? 50 : 0 }),
    getPracticeSummary: (_subjectId, topicId) => topicId === "arrays" && progress.answer
      ? { answeredQuestions: 1, correctAnswers: 1, accuracy: 100, totalQuestions: 1, completedProblems: progress["coding:dsa:arrays:p1"] ? 1 : 0, totalProblems: 1 }
      : { answeredQuestions: 0, correctAnswers: 0, accuracy: null, totalQuestions: 1, completedProblems: 0, totalProblems: topicId === "arrays" ? 1 : 0 },
    isTopicComplete: (_subjectId, topicId) => progress[`dsa:${topicId}`] === true,
    isCodingProblemComplete: (subjectId, topicId, problemId) => progress[`coding:${subjectId}:${topicId}:${problemId}`] === true,
    getMcqAttempt: () => ({ answers: {} }),
    getTopicStatus: (subject, topic) => progress[`${subject.id}:${topic.id}`] ? { id: "completed" } : { id: "notStarted" },
  };
}

describe("Learning Analytics calculations", () => {
  it("keeps unavailable subject accuracy distinct from zero accuracy", () => {
    const [subject] = getSubjectAnalytics(sampleCatalog, makeApi(), [], false);
    expect(subject.accuracy).toBeNull();
    expect(subject.answeredQuestions).toBe(0);
    expect(subject.mcqSubmissionEvents).toBeNull();
    expect(subject.totalTopics).toBe(2);
  });

  it("calculates subject completion, saved MCQ results, coding completion and tracked MCQ events separately", () => {
    const events = [
      createActivityEvent("mcq_answered", { subjectId: "dsa", topicId: "arrays", questionId: "q1", correct: true }, new Date(2026, 9, 29), "answer-1"),
      createActivityEvent("mcq_answered", { subjectId: "dsa", topicId: "graphs", questionId: "q2", correct: false }, new Date(2026, 9, 29), "answer-2"),
    ];
    const [subject] = getSubjectAnalytics(sampleCatalog, makeApi({ answer: true, "dsa:arrays": true, "coding:dsa:arrays:p1": true }), events, true);
    expect(subject).toMatchObject({
      completedTopics: 1, totalTopics: 2, completionPercent: 50,
      answeredQuestions: 1, accuracy: 100,
      completedCodingProblems: 1, totalCodingProblems: 1,
      mcqSubmissionEvents: 2,
    });
    expect(subject.attentionTopics).toEqual([]);
  });

  it("does not reconstruct historical progress trends from a current snapshot", () => {
    const analytics = buildLearningAnalytics(sampleCatalog, makeApi({ "dsa:arrays": true }), {
      days: 7,
      now: new Date(2026, 9, 30, 12),
    });
    expect(analytics.topicCoverage).toMatchObject({ completed: 1, total: 2, percent: 50 });
    expect(analytics.trend.series.every((day) => day.total === 0 && day.topicCompletions === 0)).toBe(true);
    expect(analytics.trackingAvailable).toBe(false);
    expect(analytics.activity.unknownDays).toBe(7);
  });

  it("consumes readiness-coach recommendations without inventing a second recommendation set", () => {
    const analytics = buildLearningAnalytics(sampleCatalog, makeApi(), { days: 7, now: new Date(2026, 9, 30, 12) });
    expect(analytics.recommendations.length).toBeGreaterThan(0);
    expect(analytics.recommendations.every((action) => action.href === "/simulation" || action.href === "/subjects" || /^\/subjects\/dsa\/topics\/(arrays|graphs)#(overview|practice)$/.test(action.href))).toBe(true);
  });
});
