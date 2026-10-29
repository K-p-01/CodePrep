import { describe, expect, it } from "vitest";
import { subjects } from "../src/data/subjects.js";
import { getPlacementPillars } from "../src/components/dashboard/placementMetrics.js";

function metricsApi({ complete = false, answers = {} } = {}) {
  return {
    isTopicComplete: () => complete,
    isCodingProblemComplete: () => complete,
    getMcqAttempt: (_subjectId, topicId) => ({ answers: answers[topicId] ?? {} }),
  };
}

describe("dashboard placement metrics", () => {
  it("handles an empty catalog and neutral zero-answer accuracy", () => {
    const pillars = getPlacementPillars([], metricsApi());
    expect(pillars).toHaveLength(4);
    expect(pillars.every((pillar) => pillar.totalTopics === 0 && pillar.accuracy === null)).toBe(true);
  });

  it("calculates partial topic, coding, and accuracy metrics from valid answers only", () => {
    const dbms = subjects.find((subject) => subject.id === "dbms");
    const topic = dbms.topics.find((item) => item.practice.questions.length > 0);
    const [first, second] = topic.practice.questions;
    const api = metricsApi({ answers: {
      [topic.id]: {
        [first.id]: { selectedAnswer: first.correctAnswer },
        [second.id]: { selectedAnswer: "not-an-option" },
      },
    } });
    const pillars = getPlacementPillars(subjects, api);
    const core = pillars.find((pillar) => pillar.id === "core-cs");
    expect(core.completedTopics).toBe(0);
    expect(core.totalTopics).toBeGreaterThan(0);
    expect(core.answeredQuestions).toBe(1);
    expect(core.correctAnswers).toBe(1);
    expect(core.accuracy).toBe(100);
    expect(core.completedCodingProblems).toBe(0);
  });

  it("handles all-complete metrics and keeps every recommendation destination valid", () => {
    const pillars = getPlacementPillars(subjects, metricsApi({ complete: true }));
    for (const pillar of pillars) {
      expect(pillar.completedTopics).toBe(pillar.totalTopics);
      expect(pillar.completedCodingProblems).toBe(pillar.totalCodingProblems);
      expect(pillar.accuracy).toBeNull();
      for (const subject of pillar.availableSubjects) {
        expect(subjects.some((item) => item.id === subject.id)).toBe(true);
        expect(`/subjects/${subject.id}`).toMatch(/^\/subjects\/[a-z0-9-]+$/);
      }
    }
  });
});
