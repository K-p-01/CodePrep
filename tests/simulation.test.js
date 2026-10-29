import { describe, expect, it } from "vitest";
import { subjects } from "../src/data/subjects.js";
import { renderProgressHook } from "./progressHook.jsx";
import {
  calculateSimulationResult,
  createSimulationAttempt,
  getEligibleQuestions,
  getRemainingSeconds,
  getSimulationHistory,
  isValidActiveSimulation,
  recordSimulationSubmission,
  selectSimulationCodingProblems,
  selectSimulationQuestions,
  simulationQuestionKey,
} from "../src/data/placementSimulation.js";

describe("placement simulation engine", () => {
  it("builds a unique eligible pool and selects questions evenly across subjects", () => {
    const pool = getEligibleQuestions(subjects, "full-placement");
    const keys = pool.map((entry) => entry.key);
    expect(pool.length).toBeGreaterThan(30);
    expect(new Set(keys).size).toBe(keys.length);
    const selected = selectSimulationQuestions(pool, 12, () => 0.43);
    const subjectCounts = new Map();
    for (const entry of selected) subjectCounts.set(entry.subjectId, (subjectCounts.get(entry.subjectId) ?? 0) + 1);
    expect(selected).toHaveLength(12);
    expect(new Set(selected.map((entry) => entry.key)).size).toBe(12);
    expect(Math.max(...subjectCounts.values()) - Math.min(...subjectCounts.values())).toBeLessThanOrEqual(1);
  });

  it("deduplicates coding references and preserves expiry data for refresh/resume", () => {
    const codingPool = subjects.find((subject) => subject.id === "dsa").topics.flatMap((topic) => topic.practice.problems.map((problem) => ({
      key: JSON.stringify(["dsa", topic.id, problem.id]), subjectId: "dsa", topicId: topic.id, problemId: problem.id,
    })));
    const chosenCoding = selectSimulationCodingProblems([codingPool[0], codingPool[0], codingPool[1]], 3, () => 0);
    expect(chosenCoding).toHaveLength(2);
    const pool = getEligibleQuestions(subjects, "full-placement");
    const questions = [pool[0], pool[1], pool[2]];
    const attempt = createSimulationAttempt({
      config: { focusId: "full-placement", focusLabel: "Full Placement", durationMinutes: 15 },
      questions: [...questions, questions[0]],
      codingProblems: chosenCoding,
      now: Date.parse("2026-10-29T04:00:00.000Z"),
      randomId: () => "attempt-stable",
    });
    expect(attempt.questionRefs).toHaveLength(3);
    expect(attempt.startedAt).toBe("2026-10-29T04:00:00.000Z");
    expect(attempt.expiresAt).toBe("2026-10-29T04:15:00.000Z");
    expect(isValidActiveSimulation(attempt)).toBe(true);
    expect(getRemainingSeconds(attempt.expiresAt, Date.parse(attempt.startedAt))).toBe(900);
    expect(getRemainingSeconds(attempt.expiresAt, Date.parse(attempt.expiresAt))).toBe(0);
  });

  it("uses every selected question as the score denominator, including unanswered questions", () => {
    const dsa = getEligibleQuestions(subjects, "dsa")[0];
    const dbms = getEligibleQuestions(subjects, "dbms")[0];
    const attempt = createSimulationAttempt({
      config: { focusId: "full-placement", focusLabel: "Full Placement", durationMinutes: 30 },
      questions: [dsa, dbms], now: Date.parse("2026-10-29T04:00:00Z"), randomId: () => "score-test",
    });
    attempt.answers[simulationQuestionKey(attempt.questionRefs[0])] = dsa.question.correctAnswer;
    const result = calculateSimulationResult(attempt, subjects, "2026-10-29T04:02:00.000Z");
    expect(result.result).toMatchObject({ total: 2, answered: 1, unanswered: 1, correct: 1, incorrect: 1, scorePercent: 50 });
    expect(result.result.sections.reduce((sum, section) => sum + section.total, 0)).toBe(2);
    expect(result.questionSnapshots.map((question) => question.status)).toContain("unanswered");
    expect(attempt.answers).toHaveProperty(simulationQuestionKey(attempt.questionRefs[0]));
    expect(attempt.answers).not.toHaveProperty(simulationQuestionKey(attempt.questionRefs[1]));
  });

  it("protects against duplicate submission and caps history at ten attempts", () => {
    const history = Array.from({ length: 10 }, (_, index) => ({ id: `old-${index}`, result: { total: 1, answered: 1, correct: 1, scorePercent: 100, sections: [] }, questionSnapshots: [], config: {} }));
    const metadata = { activeAttempt: { id: "new-attempt" }, recentAttempts: history };
    const submitted = recordSimulationSubmission(metadata, { id: "new-attempt", result: { total: 1, answered: 1, correct: 1, scorePercent: 100, sections: [] }, questionSnapshots: [], config: {} });
    expect(submitted.activeAttempt).toBeNull();
    expect(submitted.recentAttempts).toHaveLength(10);
    expect(submitted.recentAttempts[0].id).toBe("new-attempt");
    expect(recordSimulationSubmission(submitted, { id: "new-attempt", result: { total: 1 } })).toBe(submitted);
    expect(getSimulationHistory({ placementSimulation: submitted })).toHaveLength(10);
  });

  it("stores simulation outcomes separately from ordinary practice and topic completion", () => {
    let mounted;
    try {
      mounted = renderProgressHook();
      const question = getEligibleQuestions(subjects, "dsa")[0];
      const attempt = createSimulationAttempt({
        config: { focusId: "dsa", focusLabel: "DSA", durationMinutes: 15 },
        questions: [question], now: Date.parse("2026-10-29T04:00:00Z"), randomId: () => "separation-test",
      });
      mounted.act(() => mounted.current.startPlacementSimulation(attempt));
      const key = simulationQuestionKey(attempt.questionRefs[0]);
      mounted.act(() => mounted.current.updateActivePlacementSimulation(attempt.id, (active) => ({ ...active, answers: { [key]: question.question.correctAnswer } })));
      const updated = { ...attempt, answers: { [key]: question.question.correctAnswer } };
      const result = calculateSimulationResult(updated, subjects);
      mounted.act(() => mounted.current.submitPlacementSimulation(result));
      expect(mounted.current.progress[`mcq:${question.subjectId}:${question.topicId}`]).toBeUndefined();
      expect(mounted.current.progress[`${question.subjectId}:${question.topicId}`]).toBeUndefined();
      expect(mounted.current.progress.placementSimulation.activeAttempt).toBeNull();
      expect(mounted.current.progress.placementSimulation.recentAttempts[0].id).toBe("separation-test");
    } finally {
      mounted?.unmount();
    }
  });
});
