import { describe, expect, it } from "vitest";
import { subjects } from "../src/data/subjects.js";
import { generateDailyMission, MISSION_DURATIONS, MISSION_FOCUSES, resolveMissionTask } from "../src/components/dashboard/dailyMission.js";
import { addLocalDays, buildRevisionQueue, calculateRevisionSchedule, localDateKey, revisionItemKey } from "../src/data/revisionQueue.js";

function progressFor(catalog) {
  return {
    progress: { savedItems: [], revisionSchedules: {} },
    isCodingProblemComplete: () => false,
    getMcqAttempt: () => ({ answers: {} }),
    getPracticeSummary: (_subjectId, _topicId, practice) => ({ answeredQuestions: 0, totalQuestions: practice?.questions?.length ?? 0 }),
    getTopicStatus: () => ({ id: "notStarted" }),
    getContinueLearning(subjectIds) {
      for (const subject of catalog.filter((item) => !subjectIds || subjectIds.includes(item.id))) {
        const topic = [...subject.topics].sort((a, b) => a.order - b.order)[0];
        if (topic) return { subject, topic, reason: "Next recommended topic" };
      }
      return null;
    },
  };
}

describe("Daily Mission engine", () => {
  it("handles every supported duration and focus with tasks that resolve to catalog records", () => {
    const progressApi = progressFor(subjects);
    for (const duration of MISSION_DURATIONS) for (const { id: focus } of MISSION_FOCUSES) {
      const mission = generateDailyMission({ catalog: subjects, progressApi, duration, focus, date: new Date(2026, 9, 29) });
      expect(mission.duration).toBe(duration);
      expect(mission.focus).toBe(focus);
      expect(mission.tasks.length).toBeLessThanOrEqual(5);
      expect(new Set(mission.tasks.map((task) => task.id)).size).toBe(mission.tasks.length);
      for (const task of mission.tasks) expect(resolveMissionTask(task, subjects).available, task.id).toBe(true);
    }
  });

  it("returns a valid empty plan when no catalog content is available", () => {
    const progressApi = progressFor([]);
    const mission = generateDailyMission({ catalog: [], progressApi, duration: 20, focus: "revision" });
    expect(mission.tasks).toEqual([]);
    expect(mission.completedTaskIds).toEqual([]);
  });

  it("uses the local calendar date consistently", () => {
    expect(generateDailyMission({ catalog: [], progressApi: progressFor([]), duration: 20, focus: "balanced", date: new Date(2026, 9, 29) }).date).toBe("2026-10-29");
  });
});

describe("Smart Revision Queue", () => {
  it("schedules each outcome with the documented interval and stage", () => {
    const expected = { again: 1, hard: 2, gotIt: 4, easy: 7 };
    for (const [outcome, days] of Object.entries(expected)) {
      const schedule = calculateRevisionSchedule(null, outcome, "2026-10-29");
      expect(schedule.intervalDays).toBe(days);
      expect(schedule.dueDate).toBe(addLocalDays("2026-10-29", days));
      expect(schedule.reviewCount).toBe(1);
      expect(schedule.lastOutcome).toBe(outcome);
    }
    expect(calculateRevisionSchedule({ stage: 1, reviewCount: 2 }, "hard", "2026-10-29")).toMatchObject({ intervalDays: 3, stage: 2, reviewCount: 3 });
    expect(calculateRevisionSchedule(null, "unknown", "2026-10-29")).toBeNull();
  });

  it("classifies due, overdue, upcoming and stale saved entries using stable references", () => {
    const arrays = subjects.find((subject) => subject.id === "dsa").topics.find((topic) => topic.id === "arrays");
    const savedItems = [
      { type: "topic", subjectId: "dsa", topicId: "arrays", itemId: "arrays" },
      { type: "topic", subjectId: "dsa", topicId: "arrays", itemId: "arrays" },
      { type: "resource", subjectId: "dsa", topicId: "arrays", itemId: "removed-resource" },
    ];
    const keys = savedItems.map(revisionItemKey);
    const progressApi = progressFor(subjects);
    progressApi.progress = {
      savedItems,
      revisionSchedules: {
        [keys[0]]: { dueDate: "2026-10-28", stage: 1, reviewCount: 1 },
        [keys[2]]: { dueDate: "invalid-date", stage: 4 },
      },
    };
    const queue = buildRevisionQueue(subjects, progressApi, new Date(2026, 9, 29));
    const topicEntry = queue.find((entry) => entry.itemId === "arrays");
    const staleEntry = queue.find((entry) => entry.itemId === "removed-resource");
    expect(topicEntry.dueStatus).toBe("overdue");
    expect(topicEntry.available).toBe(true);
    expect(staleEntry.available).toBe(false);
    expect(staleEntry.dueStatus).toBe("dueToday");
    expect(queue.filter((entry) => entry.itemId === "arrays")).toHaveLength(1);
    expect(localDateKey(new Date(2026, 9, 29))).toBe("2026-10-29");
    expect(arrays.id).toBe("arrays");
  });

  it("keeps a revision key stable across object instances", () => {
    expect(revisionItemKey({ type: "mcq", subjectId: "dbms", topicId: "normalization", itemId: "first-normal-form" }))
      .toBe(revisionItemKey({ type: "mcq", subjectId: "dbms", topicId: "normalization", itemId: "first-normal-form" }));
  });
});
