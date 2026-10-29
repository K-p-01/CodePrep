import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subjects } from "../src/data/subjects.js";
import { renderProgressHook } from "./progressHook.jsx";

let mounted;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

describe("browser progress persistence", () => {
  it("starts empty without replacing the established storage key or format", () => {
    mounted = renderProgressHook();
    expect(mounted.current.progress).toEqual({ savedItems: [] });
    expect(window.localStorage.getItem("codeprep-progress-v1")).toBe(JSON.stringify({ savedItems: [] }));
  });

  it("loads existing fields and preserves unrelated or unknown fields on updates", () => {
    const existing = {
      "dsa:arrays": true,
      "coding:dsa:arrays:two-sum": true,
      "future-feature": { retained: "yes" },
      opaqueLegacyField: 42,
    };
    window.localStorage.setItem("codeprep-progress-v1", JSON.stringify(existing));
    mounted = renderProgressHook();
    expect(mounted.current.progress).toMatchObject(existing);
    mounted.act(() => mounted.current.toggleTopic("dbms", "normalization"));
    const stored = JSON.parse(window.localStorage.getItem("codeprep-progress-v1"));
    expect(stored).toMatchObject({ ...existing, "dbms:normalization": true });
  });

  it("returns the next incomplete catalog topic as a resolvable dashboard destination", () => {
    mounted = renderProgressHook();
    const next = mounted.current.getContinueLearning();
    expect(next.subject.id).toBeTruthy();
    expect(next.topic.id).toBeTruthy();
    expect(next.subject.topics.some((topic) => topic.id === next.topic.id)).toBe(true);
    expect(`/subjects/${next.subject.id}/topics/${next.topic.id}`).toMatch(/^\/subjects\/[a-z0-9-]+\/topics\/[a-z0-9-]+$/);
  });

  it("leaves malformed serialized data untouched and disables unsafe writes", () => {
    const raw = "{broken-json";
    window.localStorage.setItem("codeprep-progress-v1", raw);
    const write = vi.spyOn(Storage.prototype, "setItem");
    mounted = renderProgressHook();
    expect(mounted.current.storageNotice).toMatch(/could not be read/i);
    mounted.act(() => mounted.current.toggleTopic("dsa", "arrays"));
    expect(window.localStorage.getItem("codeprep-progress-v1")).toBe(raw);
    expect(write).not.toHaveBeenCalled();
  });

  it("preserves valid JSON with malformed subrecords instead of silently normalizing it away", () => {
    const raw = JSON.stringify({ marker: "keep", savedItems: [{ malformed: true }] });
    window.localStorage.setItem("codeprep-progress-v1", raw);
    mounted = renderProgressHook();
    expect(mounted.current.storageNotice).toMatch(/left untouched/i);
    mounted.act(() => mounted.current.toggleTopic("dsa", "arrays"));
    expect(window.localStorage.getItem("codeprep-progress-v1")).toBe(raw);
  });

  it("does not write defaults when localStorage reads fail", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage denied"); });
    const write = vi.spyOn(Storage.prototype, "setItem");
    mounted = renderProgressHook();
    expect(mounted.current.storageNotice).toMatch(/could not be read/i);
    expect(write).not.toHaveBeenCalled();
  });

  it("announces localStorage write failures without throwing during render", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota exceeded"); });
    mounted = renderProgressHook();
    expect(mounted.current.storageNotice).toMatch(/could not be saved/i);
  });

  it("keeps revision outcomes separate from normal MCQ answers and completion", () => {
    const topic = subjects.find((subject) => subject.id === "dbms").topics.find((entry) => entry.id === "database-fundamentals");
    const question = topic.practice.questions[0];
    mounted = renderProgressHook();
    mounted.act(() => mounted.current.answerMcqQuestion("dbms", topic.id, question, question.correctAnswer, topic.practice.questions.length));
    const before = mounted.current.getPracticeSummary("dbms", topic.id, topic.practice);
    mounted.act(() => mounted.current.recordRevisionOutcome({ type: "mcq", subjectId: "dbms", topicId: topic.id, itemId: question.id }, "hard"));
    const after = mounted.current.getPracticeSummary("dbms", topic.id, topic.practice);
    expect(after.answeredQuestions).toBe(before.answeredQuestions);
    expect(after.correctAnswers).toBe(before.correctAnswers);
    expect(mounted.current.progress["dbms:database-fundamentals"]).toBeUndefined();
  });

  it("completes a mission task without marking the topic complete, preserving other fields", () => {
    mounted = renderProgressHook();
    mounted.act(() => mounted.current.toggleSaved("topic", "dsa", "arrays", "arrays"));
    const mission = { date: "2026-10-29", duration: 45, focus: "dsa", tasks: [{ id: "learn-arrays", type: "learn", targetType: "notes", subjectId: "dsa", topicId: "arrays" }], completedTaskIds: [] };
    mounted.act(() => mounted.current.setDailyMission(mission));
    mounted.act(() => mounted.current.completeDailyMissionTask(mission.date, "learn-arrays"));
    expect(mounted.current.progress.dailyMission.completedTaskIds).toEqual(["learn-arrays"]);
    expect(mounted.current.progress["dsa:arrays"]).toBeUndefined();
    expect(mounted.current.progress.savedItems).toHaveLength(1);
    expect(mounted.current.progress.activityHistory.map((event) => event.type)).toEqual(["daily_mission_completed"]);
  });

  it("records topic, coding, MCQ and revision actions once without changing existing records", () => {
    const topic = subjects.find((subject) => subject.id === "dsa").topics.find((entry) => entry.id === "arrays");
    const question = topic.practice.questions[0];
    mounted = renderProgressHook();
    mounted.act(() => mounted.current.toggleTopic("dsa", "arrays"));
    mounted.act(() => mounted.current.toggleTopic("dsa", "arrays"));
    mounted.act(() => mounted.current.toggleCodingProblem("dsa", "arrays", "two-sum"));
    mounted.act(() => mounted.current.toggleCodingProblem("dsa", "arrays", "two-sum"));
    mounted.act(() => mounted.current.answerMcqQuestion("dsa", "arrays", question, question.correctAnswer, topic.practice.questions.length));
    mounted.act(() => mounted.current.answerMcqQuestion("dsa", "arrays", question, question.correctAnswer, topic.practice.questions.length));
    mounted.act(() => mounted.current.recordRevisionOutcome({ type: "topic", subjectId: "dsa", topicId: "arrays", itemId: "arrays" }, "hard"));
    const events = mounted.current.progress.activityHistory;
    expect(events.map((event) => event.type)).toEqual(["topic_completed", "coding_problem_completed", "mcq_answered", "revision_reviewed"]);
    expect(events.find((event) => event.type === "mcq_answered")).toMatchObject({ questionId: question.id, correct: true });
    expect(events.find((event) => event.type === "mcq_answered")).not.toHaveProperty("selectedAnswer");
    expect(mounted.current.progress["dsa:arrays"]).toBe(false);
    expect(mounted.current.progress["coding:dsa:arrays:two-sum"]).toBe(false);
  });

  it("records one simulation event only when a submitted result is accepted", () => {
    mounted = renderProgressHook();
    const attempt = { id: "sim-history-test", config: { focusId: "full-placement" }, questionRefs: [{ subjectId: "dsa", topicId: "arrays", questionId: "array-index-access" }] };
    const result = { id: attempt.id, config: attempt.config, submittedAt: new Date().toISOString(), result: { total: 1, answered: 1, correct: 1, scorePercent: 100 }, questionSnapshots: [] };
    mounted.act(() => mounted.current.startPlacementSimulation(attempt));
    mounted.act(() => mounted.current.submitPlacementSimulation(result));
    mounted.act(() => mounted.current.submitPlacementSimulation(result));
    expect(mounted.current.progress.activityHistory.filter((event) => event.type === "simulation_submitted")).toHaveLength(1);
    expect(mounted.current.progress.placementSimulation.recentAttempts.map((item) => item.id)).toEqual([attempt.id]);
  });

  it("saves workspace notes without changing established coding completion or legacy data", () => {
    const existing = { "coding:dsa:arrays:two-sum": true, customField: { keep: true } };
    window.localStorage.setItem("codeprep-progress-v1", JSON.stringify(existing));
    mounted = renderProgressHook();
    const notes = { approach: "Use a hash map.", keyInsight: "Look up the complement.", timeComplexity: "O(n)", spaceComplexity: "O(n)", learned: "Check before insert.", mistakeToAvoid: "Do not reuse the item." };

    mounted.act(() => mounted.current.saveCodingPracticeNotes("dsa", "arrays", "two-sum", notes));

    const stored = JSON.parse(window.localStorage.getItem("codeprep-progress-v1"));
    expect(mounted.current.getCodingPractice("dsa", "arrays", "two-sum").notes).toEqual(notes);
    expect(stored["coding:dsa:arrays:two-sum"]).toBe(true);
    expect(stored.customField).toEqual({ keep: true });
    expect(stored.codingPractice[JSON.stringify(["dsa", "arrays", "two-sum"])].notes).toEqual(notes);
  });

  it("records self-reported coding attempts and activity once while preserving completion", () => {
    const existing = { "coding:dsa:arrays:two-sum": true };
    window.localStorage.setItem("codeprep-progress-v1", JSON.stringify(existing));
    mounted = renderProgressHook();
    const attempt = { id: "workspace-attempt-1", outcome: "solved-with-hints", reflection: "Reviewed edge cases.", now: new Date("2026-10-30T10:00:00.000Z") };

    mounted.act(() => mounted.current.recordCodingAttempt("dsa", "arrays", "two-sum", attempt));
    const afterFirst = mounted.current.progress.activityHistory;
    mounted.act(() => mounted.current.recordCodingAttempt("dsa", "arrays", "two-sum", attempt));

    const practice = mounted.current.getCodingPractice("dsa", "arrays", "two-sum");
    const events = mounted.current.progress.activityHistory;
    expect(practice.attemptCount).toBe(1);
    expect(practice.attempts).toMatchObject([{ id: "workspace-attempt-1", outcome: "solved-with-hints", reflection: "Reviewed edge cases." }]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "coding_attempt_recorded", subjectId: "dsa", topicId: "arrays", problemId: "two-sum", outcome: "solved-with-hints" });
    expect(events[0]).not.toHaveProperty("reflection");
    expect(afterFirst).toHaveLength(1);
    expect(mounted.current.progress["coding:dsa:arrays:two-sum"]).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("codeprep-progress-v1"))["coding:dsa:arrays:two-sum"]).toBe(true);
  });
});
